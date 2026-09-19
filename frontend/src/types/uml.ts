export type Visibility = 'public' | 'private' | 'protected';

export interface UmlAttribute {
  id: string;
  nombre: string;
  tipo: string;
  visibilidad: Visibility;
}

export interface UmlMethod {
  id: string;
  nombre: string;
  tipoRetorno: string;
  visibilidad: Visibility;
  parametros: string; // Simplificado por ahora
}

export interface UmlClass {
  id: string;
  nombre: string;
  posicionX: number;
  posicionY: number;
  atributos: UmlAttribute[];
  metodos: UmlMethod[];
}

export type RelationType = 'ASOCIACION' | 'HERENCIA' | 'AGREGACION' | 'COMPOSICION';

export interface UmlRelation {
  id: string;
  origen: string;
  destino: string;
  tipo: RelationType;
  multiplicidadOrigen: string;
  multiplicidadDestino: string;
}

export interface UmlModelJson {
  clases: UmlClass[];
  relaciones: UmlRelation[];
}
