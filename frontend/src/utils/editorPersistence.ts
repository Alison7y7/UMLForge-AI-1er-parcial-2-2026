import type { Edge, Node } from '@xyflow/react';
import type { UmlModelJson } from '../types/uml';
import { buildUmlModel, relationData } from './umlModelMapper.ts';

export interface DiagramApiClient {
  put: (url: string, body: unknown) => Promise<unknown>;
}

export interface EditorElements {
  nodes: Node[];
  edges: Edge[];
}

export const modelToEditorElements = (model: UmlModelJson): EditorElements => ({
  nodes: model.clases.map(umlClass => ({
    id: umlClass.id.toString(),
    type: 'umlClass',
    position: { x: umlClass.posicionX, y: umlClass.posicionY },
    style: umlClass.ancho && umlClass.alto
      ? { width: umlClass.ancho, height: umlClass.alto }
      : undefined,
    data: {
      nombre: umlClass.nombre,
      estereotipo: umlClass.estereotipo || '',
      ancho: umlClass.ancho,
      alto: umlClass.alto,
      atributos: umlClass.atributos || [],
      metodos: umlClass.metodos || []
    }
  })),
  edges: model.relaciones.map(relation => ({
    id: relation.id.toString(),
    source: relation.origen.toString(),
    target: relation.destino.toString(),
    type: 'umlRelation',
    data: relationData(relation)
  }))
});

export const parsePersistedModel = (modeloJson: string): UmlModelJson => {
  const parsed = JSON.parse(modeloJson) as Partial<UmlModelJson> | null;
  if (!parsed || !Array.isArray(parsed.clases) || !Array.isArray(parsed.relaciones)) {
    throw new Error('El modelo guardado no contiene clases y relaciones válidas.');
  }
  return {
    ...parsed,
    clases: parsed.clases,
    relaciones: parsed.relaciones,
    advertencias: Array.isArray(parsed.advertencias) ? parsed.advertencias : []
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
  model: UmlModelJson
): Promise<void> => {
  await client.put(`/diagramas/${diagramId}`, {
    nombre,
    modeloJson: JSON.stringify(model)
  });
};

export const diagramSnapshot = (nombre: string, model: UmlModelJson): string =>
  JSON.stringify({ nombre, model });
