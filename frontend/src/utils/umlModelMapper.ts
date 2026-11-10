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
  edges: EditorEdgeLike[],
  advertencias: string[] = []
): UmlModelJson => ({
  clases: (nodes || []).map((node, index) => ({
    id: (node.id ?? `cls-${index + 1}`).toString(),
    nombre: (node.data?.nombre as string) || 'Clase',
    estereotipo: (node.data?.estereotipo as string) || '',
    posicionX: typeof node.position?.x === 'number' && !isNaN(node.position.x)
      ? node.position.x
      : 80 + (index % 3) * 260,
    posicionY: typeof node.position?.y === 'number' && !isNaN(node.position.y)
      ? node.position.y
      : 80 + Math.floor(index / 3) * 220,
    ancho: node.measured?.width ?? node.width ?? (node.data?.ancho as number | undefined),
    alto: node.measured?.height ?? node.height ?? (node.data?.alto as number | undefined),
    atributos: (node.data?.atributos as never[]) || [],
    metodos: (node.data?.metodos as never[]) || []
  })),
  relaciones: (edges || []).map((edge, index) => ({
    id: (edge.id ?? `rel-${index + 1}`).toString(),
    origen: (edge.source ?? '').toString(),
    destino: (edge.target ?? '').toString(),
    tipo: (edge.data?.tipo as never) || 'ASOCIACION',
    nombre: (edge.data?.nombre as string) || '',
    multiplicidadOrigen: (edge.data?.multiplicidadOrigen as string) || '',
    multiplicidadDestino: (edge.data?.multiplicidadDestino as string) || '',
    rolOrigen: (edge.data?.rolOrigen as string) || '',
    rolDestino: (edge.data?.rolDestino as string) || '',
    claseAsociacion: (edge.data?.claseAsociacion as string) || undefined
  })),
  advertencias: Array.isArray(advertencias) ? advertencias : []
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
