import type { UmlModelJson } from '../types/uml';

export interface EditorNodeLike {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  data: Record<string, unknown>;
}

export interface EditorEdgeLike {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
}

export const buildUmlModel = (
  nodes: EditorNodeLike[],
  edges: EditorEdgeLike[]
): UmlModelJson => ({
  clases: nodes.map(node => ({
    id: node.id,
    nombre: node.data.nombre as string,
    estereotipo: node.data.estereotipo as string | undefined,
    posicionX: node.position.x,
    posicionY: node.position.y,
    ancho: node.measured?.width ?? node.width ?? node.data.ancho as number | undefined,
    alto: node.measured?.height ?? node.height ?? node.data.alto as number | undefined,
    atributos: node.data.atributos as never[] || [],
    metodos: node.data.metodos as never[] || []
  })),
  relaciones: edges.map(edge => ({
    id: edge.id,
    origen: edge.source,
    destino: edge.target,
    tipo: edge.data?.tipo as never || 'ASOCIACION',
    nombre: edge.data?.nombre as string || '',
    multiplicidadOrigen: edge.data?.multiplicidadOrigen as string || '',
    multiplicidadDestino: edge.data?.multiplicidadDestino as string || '',
    rolOrigen: edge.data?.rolOrigen as string || '',
    rolDestino: edge.data?.rolDestino as string || '',
    claseAsociacion: edge.data?.claseAsociacion as string || undefined
  }))
});

export const relationData = (relation: UmlModelJson['relaciones'][number]) => ({
  tipo: relation.tipo,
  nombre: relation.nombre || '',
  multiplicidadOrigen: relation.multiplicidadOrigen || '',
  multiplicidadDestino: relation.multiplicidadDestino || '',
  rolOrigen: relation.rolOrigen || '',
  rolDestino: relation.rolDestino || '',
  claseAsociacion: relation.claseAsociacion || undefined
});
