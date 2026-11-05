import assert from 'node:assert/strict';
import test from 'node:test';
import type { UmlModelJson } from '../types/uml.ts';
import {
  attributeTypeOriginLabel,
  updatePreviewAttributeType
} from './imageAttributeTypes.ts';

const model: UmlModelJson = {
  clases: [{
    id: 'documento',
    nombre: 'Documento',
    posicionX: 100,
    posicionY: 100,
    atributos: [
      { id: 'a1', nombre: 'codigoExterno', tipo: 'UUID<Tenant>', visibilidad: 'private', origenTipo: 'IMAGEN' },
      { id: 'a2', nombre: 'importePendiente', tipo: 'BigDecimal', visibilidad: 'private', origenTipo: 'SUGERIDO' }
    ],
    metodos: []
  }],
  relaciones: []
};

test('distingue un tipo visual de una sugerencia sin alterar el valor explícito', () => {
  const [explicit, suggested] = model.clases[0].atributos;

  assert.equal(explicit.tipo, 'UUID<Tenant>');
  assert.equal(attributeTypeOriginLabel(explicit), 'Detectado en imagen');
  assert.equal(attributeTypeOriginLabel(suggested), 'Sugerido por IA');
});

test('permite corregir una sugerencia en la previsualización y la marca como usuario', () => {
  const updated = updatePreviewAttributeType(model, 'documento', 'a2', 'Money');

  assert.equal(updated.clases[0].atributos[1].tipo, 'Money');
  assert.equal(updated.clases[0].atributos[1].origenTipo, 'USUARIO');
  assert.equal(attributeTypeOriginLabel(updated.clases[0].atributos[1]), 'Corregido por usuario');
  assert.equal(model.clases[0].atributos[1].tipo, 'BigDecimal');
  assert.equal(model.clases[0].atributos[1].origenTipo, 'SUGERIDO');
});

test('mantiene compatibles los atributos anteriores sin origen de tipo', () => {
  const legacyAttribute = {
    id: 'legacy-a1', nombre: 'referencia', tipo: 'String', visibilidad: 'private' as const
  };

  assert.equal(attributeTypeOriginLabel(legacyAttribute), 'Origen no informado');
});
