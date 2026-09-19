export type Visibility = 'public' | 'private' | 'protected';

export interface UmlAttribute {
  id: string;
  nombre: string;
  tipo: string;
  visibilidad: Visibility;
}

export interface UmlParameter {
  nombre: string;
  tipo: string;
}

export interface UmlMethod {
  id: string;
  nombre: string;
  tipoRetorno: string;
  visibilidad: Visibility;
  parametros: UmlParameter[];
}

export interface UmlClass {
  lockedBy?: string;
  id: string;
  nombre: string;
  estereotipo?: string;
  posicionX: number;
  posicionY: number;
  atributos: UmlAttribute[];
  metodos: UmlMethod[];
}

export type RelationType = 'ASOCIACION' | 'HERENCIA' | 'AGREGACION' | 'COMPOSICION' | 'GENERALIZACION' | 'DEPENDENCIA';

export interface UmlRelation {
  id: string;
  origen: string;
  destino: string;
  tipo: RelationType;
  nombre?: string;
  multiplicidadOrigen: string;
  multiplicidadDestino: string;
}

export interface UmlModelJson {
  clases: UmlClass[];
  relaciones: UmlRelation[];
}

