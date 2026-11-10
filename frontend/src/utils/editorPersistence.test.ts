import assert from 'node:assert/strict';
import test from 'node:test';
import type { UmlModelJson } from '../types/uml.ts';
import {
  modelFromEditorElements,
  modelToEditorElements,
  parsePersistedModel,
  resolveRemoteModelUpdate,
  saveDiagramModel
} from './editorPersistence.ts';

const iaModel: UmlModelJson = {
  clases: [
    {
      id: 'clase-cliente', nombre: 'Cliente', estereotipo: 'entity',
      posicionX: 100, posicionY: 100, atributos: [], metodos: []
    },
    {
      id: 'clase-pedido', nombre: 'Pedido', estereotipo: 'entity',
      posicionX: 400, posicionY: 100, atributos: [], metodos: []
    }
  ],
  relaciones: [{
    id: 'relacion-cliente-pedidos',
    origen: 'clase-cliente', destino: 'clase-pedido', tipo: 'ASOCIACION',
    nombre: 'pedidos', multiplicidadOrigen: '1', multiplicidadDestino: '0..*'
  }]
};

test('aplica el modelo IA y guarda exactamente los nodos y relaciones nuevos', async () => {
  const { nodes, edges } = modelToEditorElements(iaModel);
  const modelBuiltFromNewElements = modelFromEditorElements(nodes, edges);
  const calls: Array<{ url: string; body: unknown }> = [];
  const client = {
    put: async (url: string, body: unknown) => {
      calls.push({ url, body });
      return { status: 200 };
    }
  };

  await saveDiagramModel(client, 7, 'Ventas', modelBuiltFromNewElements);

  assert.deepEqual(nodes.map(node => node.data.nombre), ['Cliente', 'Pedido']);
  assert.equal(edges.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/diagramas/7');
  const body = calls[0].body as { nombre: string; modeloJson: string };
  assert.equal(body.nombre, 'Ventas');
  assert.deepEqual(
    JSON.parse(body.modeloJson),
    JSON.parse(JSON.stringify(modelBuiltFromNewElements))
  );
});

test('propaga el error de guardado para conservar el modelo y permitir reintento', async () => {
  let attempts = 0;
  const client = {
    put: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('network unavailable');
      return { status: 200 };
    }
  };

  await assert.rejects(
    saveDiagramModel(client, 7, 'Ventas', iaModel),
    /network unavailable/
  );
  await saveDiagramModel(client, 7, 'Ventas', iaModel);
  assert.equal(attempts, 2);
});

test('restaura clases y relaciones desde modeloJson persistido', () => {
  const restored = parsePersistedModel(JSON.stringify(iaModel));
  const { nodes, edges } = modelToEditorElements(restored);

  assert.deepEqual(nodes.map(node => node.data.nombre), ['Cliente', 'Pedido']);
  assert.equal(edges[0].source, 'clase-cliente');
  assert.equal(edges[0].target, 'clase-pedido');
  assert.equal(edges[0].data?.multiplicidadDestino, '0..*');
});

test('persiste y recupera advertencias y clase de asociacion de CU9', async () => {
  const imageModel: UmlModelJson = {
    clases: [
      { id: 'venta', nombre: 'Venta', posicionX: 100, posicionY: 100, atributos: [], metodos: [] },
      { id: 'producto', nombre: 'Producto', posicionX: 400, posicionY: 100, atributos: [], metodos: [] },
      { id: 'detalle', nombre: 'Detalle', posicionX: 250, posicionY: 300, atributos: [], metodos: [] }
    ],
    relaciones: [{
      id: 'venta-producto', origen: 'venta', destino: 'producto', tipo: 'ASOCIACION',
      multiplicidadOrigen: '1', multiplicidadDestino: '', claseAsociacion: 'detalle'
    }],
    advertencias: ['Multiplicidad de Producto pendiente de revision']
  };
  const { nodes, edges } = modelToEditorElements(imageModel);
  const rebuilt = modelFromEditorElements(nodes, edges, imageModel.advertencias);
  const calls: Array<{ body: unknown }> = [];

  await saveDiagramModel({
    put: async (_url, body) => {
      calls.push({ body });
      return { status: 200 };
    }
  }, 9, 'Ventas', rebuilt);

  const saved = JSON.parse((calls[0].body as { modeloJson: string }).modeloJson);
  const restored = parsePersistedModel(JSON.stringify(saved));
  assert.equal(restored.relaciones[0].claseAsociacion, 'detalle');
  assert.deepEqual(restored.advertencias, imageModel.advertencias);
});

test('mantiene compatibilidad con modelos del primer parcial sin advertencias', () => {
  const legacyClasses = iaModel.clases.map((umlClass, index) => index !== 0 ? umlClass : ({
    ...umlClass,
    atributos: [{
      id: 'legacy-attribute', nombre: 'referencia', tipo: 'String', visibilidad: 'private' as const
    }]
  }));
  const legacyJson = JSON.stringify({ clases: legacyClasses, relaciones: iaModel.relaciones });
  const restored = parsePersistedModel(legacyJson);

  assert.deepEqual(restored.advertencias, []);
  assert.equal(restored.clases[0].nombre, 'Cliente');
  assert.equal(restored.clases[0].atributos[0].tipo, 'String');
  assert.equal(restored.clases[0].atributos[0].origenTipo, undefined);
});

test('preserva tipos detectados, sugeridos y corregidos al mapear, guardar y recargar', async () => {
  const typedModel: UmlModelJson = {
    clases: [{
      id: 'documento', nombre: 'Documento', posicionX: 50, posicionY: 70,
      atributos: [
        { id: 'a1', nombre: 'codigoExterno', tipo: 'UUID<Tenant>', visibilidad: 'private', origenTipo: 'IMAGEN' },
        { id: 'a2', nombre: 'importePendiente', tipo: 'Money', visibilidad: 'private', origenTipo: 'USUARIO' },
        { id: 'a3', nombre: 'fechaCierre', tipo: 'LocalDate', visibilidad: 'private', origenTipo: 'SUGERIDO' }
      ],
      metodos: []
    }],
    relaciones: []
  };
  const { nodes, edges } = modelToEditorElements(typedModel);
  const rebuilt = modelFromEditorElements(nodes, edges);
  let savedJson = '';

  await saveDiagramModel({
    put: async (_url, body) => {
      savedJson = (body as { modeloJson: string }).modeloJson;
      return { status: 200 };
    }
  }, 11, 'Documentos', rebuilt);

  const restored = parsePersistedModel(savedJson);
  assert.deepEqual(restored.clases[0].atributos, typedModel.clases[0].atributos);
});

test('rechaza un modelo persistido inválido para que la carga muestre un error', () => {
  assert.throws(
    () => parsePersistedModel('{"invalido":true}'),
    /clases y relaciones válidas/
  );
  assert.throws(
    () => parsePersistedModel('{"clases":"no-un-arreglo"}'),
    /clases y relaciones válidas/
  );
  assert.throws(
    () => parsePersistedModel('{ invalid json'),
    /clases y relaciones válidas/
  );
});

test('normaliza modelos heredados con elements y connections', () => {
  const legacy = parsePersistedModel('{"elements":[],"connections":[]}');
  assert.deepEqual(legacy.clases, []);
  assert.deepEqual(legacy.relaciones, []);
  assert.deepEqual(legacy.advertencias, []);
});

test('normaliza payloads parciales como Condominio sin relaciones sin arrojar error', () => {
  const partial = parsePersistedModel('{"clases":[{"id":"c-condo","nombre":"Condominio"}]}');
  assert.equal(partial.clases.length, 1);
  assert.equal(partial.clases[0].nombre, 'Condominio');
  assert.deepEqual(partial.relaciones, []);
});

test('normaliza cadenas vacías y objetos nulos a diagramas vacíos válidos', () => {
  assert.deepEqual(parsePersistedModel(''), { clases: [], relaciones: [], advertencias: [] });
  assert.deepEqual(parsePersistedModel('{}'), { clases: [], relaciones: [], advertencias: [] });
  assert.deepEqual(parsePersistedModel(null), { clases: [], relaciones: [], advertencias: [] });
});

test('aplica una versión remota nueva cuando el editor está limpio', () => {
  assert.equal(resolveRemoteModelUpdate({
    currentSnapshot: 'base', lastSavedSnapshot: 'base', remoteSnapshot: 'remote',
    currentVersion: 3, remoteVersion: 4
  }), 'apply');
});

test('protege cambios locales cuando llega una versión remota diferente', () => {
  assert.equal(resolveRemoteModelUpdate({
    currentSnapshot: 'local-dirty', lastSavedSnapshot: 'base', remoteSnapshot: 'remote',
    currentVersion: 3, remoteVersion: 4
  }), 'conflict');
});

test('reconoce el commit propio sin perder ediciones hechas mientras se guardaba', () => {
  assert.equal(resolveRemoteModelUpdate({
    currentSnapshot: 'newer-local-work', lastSavedSnapshot: 'base', remoteSnapshot: 'submitted-model',
    currentVersion: 3, remoteVersion: 4,
    pendingChangeId: 'change-123', remoteChangeId: 'change-123'
  }), 'acknowledge');
});

test('ignora eventos STOMP duplicados o fuera de orden', () => {
  assert.equal(resolveRemoteModelUpdate({
    currentSnapshot: 'current', lastSavedSnapshot: 'current', remoteSnapshot: 'old',
    currentVersion: 5, remoteVersion: 5
  }), 'ignore');
});
