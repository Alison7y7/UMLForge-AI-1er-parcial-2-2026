import type { Edge, Node } from '@xyflow/react';
import type { UmlModelJson } from '../types/uml';
import { buildUmlModel, relationData } from './umlModelMapper.ts';

export interface DiagramApiClient {
  put: (url: string, body: unknown) => Promise<any>;
}

export interface EditorElements {
  nodes: Node[];
  edges: Edge[];
}

export const modelToEditorElements = (model: UmlModelJson): EditorElements => ({
  nodes: (model.clases || []).map((umlClass, index) => ({
    id: (umlClass.id ?? `cls-${index + 1}`).toString(),
    type: 'umlClass',
    position: {
      x: typeof umlClass.posicionX === 'number' && !isNaN(umlClass.posicionX)
        ? umlClass.posicionX
        : 80 + (index % 3) * 260,
      y: typeof umlClass.posicionY === 'number' && !isNaN(umlClass.posicionY)
        ? umlClass.posicionY
        : 80 + Math.floor(index / 3) * 220
    },
    style: umlClass.ancho && umlClass.alto
      ? { width: umlClass.ancho, height: umlClass.alto }
      : undefined,
    data: {
      nombre: umlClass.nombre || 'Clase',
      estereotipo: umlClass.estereotipo || '',
      ancho: umlClass.ancho,
      alto: umlClass.alto,
      atributos: Array.isArray(umlClass.atributos) ? umlClass.atributos : [],
      metodos: Array.isArray(umlClass.metodos) ? umlClass.metodos : []
    }
  })),
  edges: (model.relaciones || []).map((relation, index) => ({
    id: (relation.id ?? `rel-${index + 1}`).toString(),
    source: (relation.origen ?? '').toString(),
    target: (relation.destino ?? '').toString(),
    type: 'umlRelation',
    data: relationData(relation)
  }))
});

export const parsePersistedModel = (modeloJson: unknown): UmlModelJson => {
  if (modeloJson === null || modeloJson === undefined || modeloJson === '') {
    return { clases: [], relaciones: [], advertencias: [] };
  }

  let parsed: any;
  if (typeof modeloJson === 'string') {
    const trimmed = modeloJson.trim();
    if (trimmed === '' || trimmed === '{}' || trimmed === '[]' || trimmed === 'null') {
      return { clases: [], relaciones: [], advertencias: [] };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
    }
  } else if (typeof modeloJson === 'object') {
    parsed = modeloJson;
  } else {
    throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
  }

  const rawClasses = parsed.clases ?? parsed.classes ?? parsed.elements ?? parsed.nodes;
  const rawRelations = parsed.relaciones ?? parsed.relations ?? parsed.relationships ?? parsed.connections ?? parsed.edges;

  const hasRecognizedKeys = rawClasses !== undefined || rawRelations !== undefined ||
    parsed.advertencias !== undefined || parsed.warnings !== undefined;

  const isCompletelyEmptyObject = Object.keys(parsed).length === 0;

  if (!hasRecognizedKeys && !isCompletelyEmptyObject) {
    throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
  }

  if (rawClasses !== undefined && !Array.isArray(rawClasses)) {
    throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
  }
  if (rawRelations !== undefined && !Array.isArray(rawRelations)) {
    throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
  }

  const clasesArray = Array.isArray(rawClasses) ? rawClasses : [];
  const relacionesArray = Array.isArray(rawRelations) ? rawRelations : [];

  const normalizedClases = clasesArray.map((cls: any, index: number) => {
    const id = String(cls.id ?? cls.name ?? cls.nombre ?? `c${index + 1}`);
    const nombre = String(cls.nombre ?? cls.name ?? 'Clase');
    const estereotipo = String(cls.estereotipo ?? cls.stereotype ?? '');
    const posicionX = typeof cls.posicionX === 'number' && !isNaN(cls.posicionX)
      ? cls.posicionX
      : (typeof cls.x === 'number' && !isNaN(cls.x) ? cls.x : 80 + (index % 3) * 260);
    const posicionY = typeof cls.posicionY === 'number' && !isNaN(cls.posicionY)
      ? cls.posicionY
      : (typeof cls.y === 'number' && !isNaN(cls.y) ? cls.y : 80 + Math.floor(index / 3) * 220);
    const ancho = typeof cls.ancho === 'number' ? cls.ancho : (typeof cls.width === 'number' ? cls.width : undefined);
    const alto = typeof cls.alto === 'number' ? cls.alto : (typeof cls.height === 'number' ? cls.height : undefined);
    const atributos = Array.isArray(cls.atributos) ? cls.atributos : (Array.isArray(cls.attributes) ? cls.attributes : []);
    const metodos = Array.isArray(cls.metodos) ? cls.metodos : (Array.isArray(cls.methods) ? cls.methods : []);

    return {
      id,
      nombre,
      estereotipo,
      posicionX,
      posicionY,
      ancho,
      alto,
      atributos,
      metodos
    };
  });

  const normalizeRelType = (t: any): string => {
    if (!t) return 'ASOCIACION';
    const s = String(t).toUpperCase();
    if (s.includes('ASOC') || s === 'ASSOCIATION') return 'ASOCIACION';
    if (s.includes('HEREN') || s.includes('INHERIT') || s.includes('GENERALI') || s === 'GENERALIZACION') return 'HERENCIA';
    if (s.includes('AGREG') || s === 'AGGREGATION') return 'AGREGACION';
    if (s.includes('COMPOS') || s === 'COMPOSITION') return 'COMPOSICION';
    if (s.includes('DEPEN') || s === 'DEPENDENCY') return 'DEPENDENCIA';
    return 'ASOCIACION';
  };

  const normalizedRelaciones = relacionesArray.map((rel: any, index: number) => {
    const id = String(rel.id ?? `r${index + 1}`);
    const origen = String(rel.origen ?? rel.source ?? rel.from ?? '');
    const destino = String(rel.destino ?? rel.target ?? rel.to ?? '');
    const tipo = normalizeRelType(rel.tipo ?? rel.type);
    const nombre = String(rel.nombre ?? rel.name ?? '');
    const multiplicidadOrigen = String(rel.multiplicidadOrigen ?? rel.sourceMultiplicity ?? '');
    const multiplicidadDestino = String(rel.multiplicidadDestino ?? rel.targetMultiplicity ?? '');
    const rolOrigen = String(rel.rolOrigen ?? rel.sourceRole ?? '');
    const rolDestino = String(rel.rolDestino ?? rel.targetRole ?? '');
    const claseAsociacion = rel.claseAsociacion ? String(rel.claseAsociacion) : undefined;

    return {
      id,
      origen,
      destino,
      tipo,
      nombre,
      multiplicidadOrigen,
      multiplicidadDestino,
      rolOrigen,
      rolDestino,
      claseAsociacion
    };
  });

  const rawAdvertencias = parsed.advertencias ?? parsed.warnings;
  const advertencias = Array.isArray(rawAdvertencias) ? rawAdvertencias.map(String) : [];

  return {
    clases: normalizedClases,
    relaciones: normalizedRelaciones,
    advertencias
  } as UmlModelJson;
};

export const modelFromEditorElements = (
  nodes: Node[],
  edges: Edge[],
  advertencias: string[] = []
): UmlModelJson => buildUmlModel(nodes as never[], edges as never[], advertencias);

export const saveDiagramModel = async (
  client: DiagramApiClient,
  diagramId: string | number,
  nombre: string,
  model: UmlModelJson,
  expectedVersion?: number,
  changeId?: string
): Promise<number | undefined> => {
  const response = await client.put(`/diagramas/${diagramId}`, {
    nombre,
    modeloJson: JSON.stringify(model),
    ...(expectedVersion !== undefined ? { version: expectedVersion } : {}),
    ...(changeId ? { changeId } : {})
  });
  return response?.data?.version;
};

export const diagramSnapshot = (nombre: string, model: UmlModelJson): string =>
  JSON.stringify({ nombre, model });

export type RemoteModelUpdateAction = 'ignore' | 'apply' | 'acknowledge' | 'conflict';

export const resolveRemoteModelUpdate = ({
  currentSnapshot,
  lastSavedSnapshot,
  remoteSnapshot,
  currentVersion,
  remoteVersion,
  pendingChangeId,
  remoteChangeId
}: {
  currentSnapshot: string;
  lastSavedSnapshot: string | null;
  remoteSnapshot: string;
  currentVersion?: number;
  remoteVersion?: number;
  pendingChangeId?: string | null;
  remoteChangeId?: string | null;
}): RemoteModelUpdateAction => {
  if (remoteVersion !== undefined && currentVersion !== undefined && remoteVersion <= currentVersion) {
    return 'ignore';
  }
  if (currentSnapshot === remoteSnapshot) return 'acknowledge';
  if (lastSavedSnapshot !== null && currentSnapshot === lastSavedSnapshot) return 'apply';
  if (pendingChangeId && remoteChangeId === pendingChangeId) return 'acknowledge';
  return 'conflict';
};
