export interface ProjectHistoryEvent {
  id: string;
  tipo: 'CONVERSACION' | 'RESPUESTA_IA' | 'DECISION' | 'CAMBIO_UML' | 'ACTIVIDAD';
  fechaHora: string;
  participanteId?: number;
  participanteNombre?: string;
  diagramaId?: number;
  diagramaNombre?: string;
  titulo: string;
  detalle: string;
  estado: string;
  metadatos?: Record<string, any>;
  adjuntos?: Array<{ id: string; nombre: string; tamanoBytes: number; mimeType: string; contenidoUrl: string }>;
}

export interface ProjectHistoryResponse {
  eventos: ProjectHistoryEvent[];
  siguienteCursor?: string;
  hayMas: boolean;
}

export interface ProjectContinuity {
  ultimoDiagrama?: { id: number; nombre: string; version: number; fechaActualizacion: string };
  ultimaActividad?: string;
  cambiosRecientes: ProjectHistoryEvent[];
  recomendacionesPendientes: number;
  pendientesRecientes: Array<{
    mensajeId: number;
    recomendacionId: string;
    diagramaId: number;
    descripcion: string;
    estado: string;
  }>;
}
