export type TipoEmisorChat = 'USUARIO' | 'IA' | 'SISTEMA';

export type EstadoMensajeChat = 'ENVIADO' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';

export type TipoCambioUml =
  | 'RENOMBRAR_CLASE'
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
  [key: string]: any;
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
