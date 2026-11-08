export type TipoEmisorChat = 'USUARIO' | 'IA' | 'SISTEMA';

export type EstadoMensajeChat = 'ENVIADO' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';

export type TipoCambioUml =
  | 'AGREGAR_CLASE'
  | 'RENOMBRAR_CLASE'
  | 'ELIMINAR_CLASE'
  | 'AGREGAR_ATRIBUTO'
  | 'MODIFICAR_ATRIBUTO'
  | 'ELIMINAR_ATRIBUTO'
  | 'AGREGAR_METODO'
  | 'MODIFICAR_METODO'
  | 'ELIMINAR_METODO'
  | 'AGREGAR_RELACION'
  | 'MODIFICAR_RELACION'
  | 'ELIMINAR_RELACION'
  | 'OTRO';

export type TipoElementoUml = 'CLASE' | 'ATRIBUTO' | 'METODO' | 'RELACION';

export interface ElementoUmlAfectado {
  tipo: TipoElementoUml;
  id: string;
  nombre: string;
}

export interface RecomendacionUml {
  id: string;
  diagramaId: number;
  versionDiagrama?: number;
  tipoCambio: TipoCambioUml;
  descripcion: string;
  elementoAfectado: ElementoUmlAfectado;
  cambioPropuesto: any;
}

export interface MetadatosMensajeChat {
  cu?: string;
  solicitudId?: string;
  proveedor?: string;
  diagramaId?: number;
  diagramaVersion?: number;
  mensajeUsuarioId?: number;
  tokensUsados?: number;
  recomendacionesDescartadas?: number;
  requiereConfirmacion?: boolean;
  recomendaciones?: RecomendacionUml[];
  evento?: string;
  recomendacionId?: string;
  aplicadaPorId?: number;
  detalle?: string;
  tipoInforme?: 'REVISION_UML';
  diagramaNombre?: string;
  fechaRevision?: string;
  solicitanteId?: number;
  solicitanteNombre?: string;
  resumenRevision?: string;
  hallazgos?: HallazgoRevisionUml[];
  [key: string]: any;
}

export interface HallazgoRevisionUml {
  id: string;
  severidad: 'ERROR' | 'ADVERTENCIA' | 'SUGERENCIA';
  categoria: string;
  elementoTipo: string;
  elementoId?: string;
  elementoNombre?: string;
  explicacion: string;
  evidencia: string;
  propuesta: string;
  estado: 'PENDIENTE' | 'APLICADA' | 'DESCARTADA' | 'OBSOLETA';
}

export interface MensajeChat {
  id: number;
  proyectoId: number;
  emisorId: number | null;
  emisorNombre: string | null;
  tipoEmisor: TipoEmisorChat;
  contenido: string;
  fechaHora: string;
  estado: EstadoMensajeChat;
  correlacionId?: string | null;
  metadatos?: MetadatosMensajeChat | null;
  adjuntos?: AdjuntoChat[];
}

export type CategoriaAdjuntoChat = 'AUDIO' | 'IMAGEN' | 'DOCUMENTO' | 'DATOS';

export interface AdjuntoChat {
  id: string;
  nombre: string;
  tamanoBytes: number;
  mimeType: string;
  categoria: CategoriaAdjuntoChat;
  contenidoUrl: string;
}

export interface HistorialChatResponse {
  mensajes: MensajeChat[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
}

export interface MensajeChatRequest {
  contenido: string;
  metadatos?: Record<string, any> | null;
}

export interface SolicitudIAChatRequest {
  mensajeId: number;
  diagramaId: number;
  solicitudId: string;
}

export type EstadoSolicitudIAChat = 'PROCESANDO' | 'COMPLETADA' | 'ERROR';

export interface SolicitudIAChatResponse {
  solicitudId: string;
  estado: EstadoSolicitudIAChat;
  proveedor?: string | null;
  mensaje: MensajeChat;
}

export interface ActividadIAChat {
  solicitudId: string;
  usuarioId: number;
  usuarioNombre: string;
  estado: 'INICIO' | 'FIN';
  fechaHora: string;
}

export interface AplicarRecomendacionResponse {
  recomendacionId: string;
  diagramaId: number;
  versionAnterior: number;
  versionNueva: number;
  modeloJson: string;
  mensajeSistema: MensajeChat;
}

export interface RevalidacionRecomendacionResponse {
  recomendacionId: string;
  diagramaId: number;
  versionOriginal: number;
  versionActual: number;
  compatible: boolean;
  pendienteDependencia: boolean;
  dependenciaRequerida?: string | null;
  estado: 'COMPATIBLE' | 'PENDIENTE_DEPENDENCIA' | 'OBSOLETA' | 'APLICADA' | 'DESCARTADA';
  detalle?: string | null;
}

export interface AplicarLoteRecomendacionesResponse {
  diagramaId: number;
  versionAnterior: number;
  versionNueva: number;
  recomendacionesAplicadasIds: string[];
  recomendacionesOmitidasIds: string[];
  modeloJson: string;
  mensajeSistema: MensajeChat;
}
