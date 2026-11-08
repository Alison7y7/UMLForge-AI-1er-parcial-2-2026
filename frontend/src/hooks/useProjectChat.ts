import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/axios';
import { stompService, type StompConnectionStatus } from '../services/stompService';
import type {
  MensajeChat,
  HistorialChatResponse,
  MensajeChatRequest,
  SolicitudIAChatRequest,
  SolicitudIAChatResponse,
  ActividadIAChat,
  AplicarRecomendacionResponse,
  RevalidacionRecomendacionResponse,
  AplicarLoteRecomendacionesResponse,
} from '../types/chat';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface UseProjectChatResult {
  mensajes: MensajeChat[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sending: boolean;
  sendingIA: boolean;
  iaActivities: ActividadIAChat[];
  applyingRecommendationId: string | null;
  error: string | null;
  connectionStatus: StompConnectionStatus;
  enviarMensaje: (contenido: string, metadatos?: Record<string, any>) => Promise<MensajeChat>;
  enviarMensajeConAdjuntos: (
    contenido: string,
    archivos: File[],
    metadatos?: Record<string, any>,
    onProgress?: (percent: number) => void
  ) => Promise<MensajeChat>;
  consultarIA: (contenido: string, diagramaId: number | string, tipoSolicitud?: 'CHAT' | 'REVISION_UML', cambiosLocalesSinGuardar?: boolean) => Promise<MensajeChat>;
  elegirAlternativa: (mensajeId: number, alternativaId: string) => Promise<MensajeChat>;
  descartarAlternativa: (mensajeId: number, alternativaId: string) => Promise<MensajeChat>;
  aplicarRecomendacion: (mensajeId: number, recomendacionId: string, confirmarEliminacion?: boolean) => Promise<AplicarRecomendacionResponse>;
  descartarRecomendacion: (mensajeId: number, recomendacionId: string) => Promise<MensajeChat>;
  revalidarRecomendacion?: (mensajeId: number, recomendacionId: string) => Promise<RevalidacionRecomendacionResponse>;
  aplicarCompatibles?: (mensajeId: number) => Promise<AplicarLoteRecomendacionesResponse>;
  cargarMas: () => Promise<void>;
  recargar: () => Promise<void>;
}

export function useProjectChat(proyectoId: number | string | undefined): UseProjectChatResult {
  const numericProyectoId = proyectoId ? Number(proyectoId) : null;
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [loading, setLoading] = useState(Boolean(numericProyectoId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendingIA, setSendingIA] = useState(false);
  const [iaActivities, setIaActivities] = useState<ActividadIAChat[]>([]);
  const [applyingRecommendationId, setApplyingRecommendationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<StompConnectionStatus>(
    stompService.getStatus()
  );

  const isMountedRef = useRef(true);
  const sendingIARef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const cargarHistorial = useCallback(
    async (pagina: number, isInitial = false) => {
      if (!numericProyectoId) return;

      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await api.get<HistorialChatResponse>(
          `/proyectos/${numericProyectoId}/chat/mensajes`,
          {
            params: { pagina, tamano: 50 },
          }
        );

        if (!isMountedRef.current) return;

        const data = response.data;
        // El backend retorna los mensajes ordenados descendentemente (más recientes primero).
        // Los invertimos para presentarlos cronológicamente (más antiguos arriba, más recientes abajo).
        const cronologicos = [...(data.mensajes || [])].reverse();

        setMensajes((prev) => {
          if (isInitial) {
            return cronologicos;
          }
          // Si estamos paginando hacia atrás (cargando mensajes más antiguos):
          const idsExistentes = new Set(prev.map((m) => m.id));
          const nuevosAntiguos = cronologicos.filter((m) => !idsExistentes.has(m.id));
          return [...nuevosAntiguos, ...prev];
        });

        setPage(data.pagina);
        setHasMore(!data.ultima);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const errMsg =
          err.response?.data?.message ||
          (err.response?.status === 403
            ? 'No tienes permiso para acceder al chat de este proyecto'
            : 'Error al cargar los mensajes del chat');
        setError(errMsg);
      } finally {
        if (isMountedRef.current) {
          if (isInitial) setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [numericProyectoId]
  );

  const recargar = useCallback(async () => {
    await cargarHistorial(0, true);
  }, [cargarHistorial]);

  const sincronizarRecientes = useCallback(async () => {
    if (!numericProyectoId) return;
    try {
      const response = await api.get<HistorialChatResponse>(`/proyectos/${numericProyectoId}/chat/mensajes`, {
        params: { pagina: 0, tamano: 50 },
      });
      const recent = [...(response.data.mensajes || [])].reverse();
      if (!isMountedRef.current) return;
      setMensajes(previous => {
        const byId = new Map(previous.map(message => [message.id, message]));
        recent.forEach(message => byId.set(message.id, message));
        return [...byId.values()].sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
      });
    } catch {
      // La reconexión STOMP puede continuar; el usuario conserva el historial ya cargado.
    }
  }, [numericProyectoId]);

  const cargarMas = useCallback(async () => {
    if (loadingMore || loading || !hasMore || !numericProyectoId) return;
    await cargarHistorial(page + 1, false);
  }, [cargarHistorial, hasMore, loading, loadingMore, numericProyectoId, page]);

  const enviarMensaje = useCallback(
    async (contenido: string, metadatos?: Record<string, any>): Promise<MensajeChat> => {
      if (!numericProyectoId) {
        throw new Error('No se ha especificado un proyecto válido');
      }

      const textoLimpio = contenido.trim();
      if (!textoLimpio) {
        throw new Error('El mensaje no puede estar vacío');
      }

      setSending(true);
      setError(null);

      try {
        const requestPayload: MensajeChatRequest = {
          contenido: textoLimpio,
          metadatos: metadatos && Object.keys(metadatos).length > 0 ? metadatos : {},
        };

        const response = await api.post<MensajeChat>(
          `/proyectos/${numericProyectoId}/chat/mensajes`,
          requestPayload
        );

        const nuevoMensaje = response.data;

        if (isMountedRef.current) {
          // Si por alguna razón el WebSocket aún no lo entregó o no hay conexión,
          // lo agregamos de inmediato asegurando idempotencia por ID
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevoMensaje.id)) {
              return prev;
            }
            return [...prev, nuevoMensaje];
          });
        }

        return nuevoMensaje;
      } catch (err: any) {
        const errMsg =
          err.response?.data?.message ||
          (err.response?.status === 403
            ? 'No tienes permiso para enviar mensajes en este proyecto'
            : 'Error al enviar el mensaje');
        if (isMountedRef.current) {
          setError(errMsg);
        }
        throw new Error(errMsg);
      } finally {
        if (isMountedRef.current) {
          setSending(false);
        }
      }
    },
    [numericProyectoId]
  );

  const enviarMensajeConAdjuntos = useCallback(
    async (
      contenido: string,
      archivos: File[],
      metadatos?: Record<string, any>,
      onProgress?: (percent: number) => void
    ): Promise<MensajeChat> => {
      if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
      if (!archivos.length) return enviarMensaje(contenido, metadatos);

      setSending(true);
      setError(null);
      const formData = new FormData();
      formData.append('contenido', contenido.trim());
      formData.append('metadatos', JSON.stringify(metadatos || {}));
      archivos.forEach((archivo) => formData.append('archivos', archivo, archivo.name));

      try {
        const response = await api.post<MensajeChat>(
          `/proyectos/${numericProyectoId}/chat/mensajes/con-adjuntos`,
          formData,
          {
            onUploadProgress: (event) => {
              if (event.total && onProgress) {
                onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
              }
            },
          }
        );
        const nuevoMensaje = response.data;
        if (isMountedRef.current) {
          setMensajes((prev) => prev.some((m) => m.id === nuevoMensaje.id)
            ? prev
            : [...prev, nuevoMensaje]);
        }
        return nuevoMensaje;
      } catch (err: any) {
        const errMsg = err.response?.data?.message
          || (err.response?.status === 413
            ? 'El archivo supera el tamaño permitido'
            : 'No se pudo enviar el mensaje con adjuntos');
        if (isMountedRef.current) setError(errMsg);
        throw new Error(errMsg);
      } finally {
        if (isMountedRef.current) setSending(false);
      }
    },
    [enviarMensaje, numericProyectoId]
  );

  const consultarIA = useCallback(
    async (contenido: string, diagramaId: number | string, tipoSolicitud: 'CHAT' | 'REVISION_UML' = 'CHAT', cambiosLocalesSinGuardar = false): Promise<MensajeChat> => {
      if (!numericProyectoId) {
        throw new Error('No se ha especificado un proyecto válido');
      }
      const numericDiagramaId = Number(diagramaId);
      if (!numericDiagramaId || isNaN(numericDiagramaId)) {
        throw new Error('Debes seleccionar un diagrama para que la IA tenga contexto del modelo UML');
      }

      const textoLimpio = contenido.trim();
      if (!textoLimpio) {
        throw new Error('La consulta para la IA no puede estar vacía');
      }

      if (sendingIARef.current) {
        throw new Error('Ya hay una consulta de IA en proceso. Por favor espera.');
      }

      sendingIARef.current = true;
      setSendingIA(true);
      setError(null);

      try {
        // 1. Guardar primero el mensaje humano mediante REST POST
        const requestPayload: MensajeChatRequest = {
          contenido: textoLimpio,
          metadatos: {
            origen: 'chat_ia',
            diagramaId: numericDiagramaId,
            tipoSolicitud,
            cambiosLocalesSinGuardar,
          },
        };

        const humanResponse = await api.post<MensajeChat>(
          `/proyectos/${numericProyectoId}/chat/mensajes`,
          requestPayload
        );
        const mensajeHumano = humanResponse.data;

        if (isMountedRef.current) {
          setMensajes((prev) => {
            if (prev.some((m) => m.id === mensajeHumano.id)) {
              return prev;
            }
            return [...prev, mensajeHumano];
          });
        }

        // 2. Generar UUID único para la solicitud
        const solicitudId = generateUUID();

        // 3. Ejecutar solicitud de IA con proyecto y diagrama
        const solicitudPayload: SolicitudIAChatRequest = {
          mensajeId: mensajeHumano.id,
          diagramaId: numericDiagramaId,
          solicitudId,
        };

        const iaResponse = await api.post<SolicitudIAChatResponse>(
          `/proyectos/${numericProyectoId}/chat/ia/solicitudes`,
          solicitudPayload
        );

        const dataIA = iaResponse.data;
        const mensajeIA = dataIA.mensaje;

        if (isMountedRef.current && mensajeIA) {
          setMensajes((prev) => {
            const index = prev.findIndex((m) => m.id === mensajeIA.id);
            if (index >= 0) {
              const actualizados = [...prev];
              actualizados[index] = mensajeIA;
              return actualizados;
            }
            return [...prev, mensajeIA];
          });
        }

        return mensajeIA;
      } catch (err: any) {
        const errorMensaje = err.response?.data?.mensaje;
        if (isMountedRef.current && errorMensaje && errorMensaje.id) {
          setMensajes((prev) => {
            if (prev.some((m) => m.id === errorMensaje.id)) {
              return prev;
            }
            return [...prev, errorMensaje];
          });
        }

        const errMsg =
          err.response?.data?.message ||
          (err.response?.status === 403
            ? 'No tienes permiso para solicitar asistencia de IA en este proyecto'
            : err.response?.status === 502
            ? 'No fue posible obtener una respuesta de IA. Revisa la disponibilidad de los proveedores.'
            : 'Error al consultar la IA colaborativa');

        if (isMountedRef.current) {
          setError(errMsg);
        }
        throw new Error(errMsg);
      } finally {
        sendingIARef.current = false;
        if (isMountedRef.current) {
          setSendingIA(false);
        }
      }
    },
    [numericProyectoId]
  );

  const elegirAlternativa = useCallback(async (mensajeId: number, alternativaId: string) => {
    if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
    const response = await api.post<MensajeChat>(
      `/proyectos/${numericProyectoId}/chat/recomendaciones/alternativas/${encodeURIComponent(alternativaId)}/elegir`,
      { mensajeId }
    );
    if (isMountedRef.current) {
      setMensajes(previous => previous.map(message => message.id === response.data.id ? response.data : message));
    }
    return response.data;
  }, [numericProyectoId]);

  const descartarAlternativa = useCallback(async (mensajeId: number, alternativaId: string) => {
    if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
    const response = await api.post<MensajeChat>(
      `/proyectos/${numericProyectoId}/chat/recomendaciones/alternativas/${encodeURIComponent(alternativaId)}/descartar`,
      { mensajeId }
    );
    if (isMountedRef.current) {
      setMensajes(previous => previous.map(message => message.id === response.data.id ? response.data : message));
    }
    return response.data;
  }, [numericProyectoId]);

  const aplicarRecomendacion = useCallback(
    async (mensajeId: number, recomendacionId: string, confirmarEliminacion = false): Promise<AplicarRecomendacionResponse> => {
      if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
      if (applyingRecommendationId) throw new Error('Ya se está aplicando una recomendación');
      setApplyingRecommendationId(recomendacionId);
      setError(null);
      try {
        const response = await api.post<AplicarRecomendacionResponse>(
          `/proyectos/${numericProyectoId}/chat/recomendaciones/${encodeURIComponent(recomendacionId)}/aplicar`,
          { mensajeId, confirmarEliminacion }
        );
        const systemMessage = response.data.mensajeSistema;
        if (isMountedRef.current && systemMessage) {
          setMensajes((previous) => previous.some((message) => message.id === systemMessage.id)
            ? previous
            : [...previous, systemMessage]);
        }
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.message
          || (err.response?.status === 409
            ? 'La recomendación está obsoleta, ya fue aplicada o el diagrama cambió.'
            : err.response?.status === 403
            ? 'No tienes permiso para aplicar recomendaciones en este proyecto.'
            : 'No se pudo aplicar la recomendación UML.');
        if (isMountedRef.current) setError(message);
        throw new Error(message);
      } finally {
        if (isMountedRef.current) setApplyingRecommendationId(null);
      }
    },
    [applyingRecommendationId, numericProyectoId]
  );

  const descartarRecomendacion = useCallback(
    async (mensajeId: number, recomendacionId: string): Promise<MensajeChat> => {
      if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
      setApplyingRecommendationId(recomendacionId);
      try {
        const response = await api.post<MensajeChat>(
          `/proyectos/${numericProyectoId}/chat/recomendaciones/${encodeURIComponent(recomendacionId)}/descartar`,
          { mensajeId, confirmarEliminacion: false }
        );
        if (isMountedRef.current) {
          setMensajes(previous => previous.some(message => message.id === response.data.id)
            ? previous : [...previous, response.data]);
        }
        return response.data;
      } catch (err: any) {
        throw new Error(err.response?.data?.message || 'No se pudo descartar la recomendación.');
      } finally {
        if (isMountedRef.current) setApplyingRecommendationId(null);
      }
    },
    [numericProyectoId]
  );

  const revalidarRecomendacion = useCallback(
    async (mensajeId: number, recomendacionId: string): Promise<RevalidacionRecomendacionResponse> => {
      if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
      const response = await api.get<RevalidacionRecomendacionResponse>(
        `/proyectos/${numericProyectoId}/chat/recomendaciones/${encodeURIComponent(recomendacionId)}/revalidar`,
        { params: { mensajeId } }
      );
      return response.data;
    },
    [numericProyectoId]
  );

  const aplicarCompatibles = useCallback(
    async (mensajeId: number): Promise<AplicarLoteRecomendacionesResponse> => {
      if (!numericProyectoId) throw new Error('No se ha especificado un proyecto válido');
      setApplyingRecommendationId('LOTE');
      try {
        const response = await api.post<AplicarLoteRecomendacionesResponse>(
          `/proyectos/${numericProyectoId}/chat/recomendaciones/mensajes/${mensajeId}/aplicar-compatibles`
        );
        const systemMessage = response.data.mensajeSistema;
        if (isMountedRef.current && systemMessage) {
          setMensajes((previous) => previous.some((message) => message.id === systemMessage.id)
            ? previous
            : [...previous, systemMessage]);
        }
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.message || 'No se pudieron aplicar las recomendaciones compatibles.';
        if (isMountedRef.current) setError(message);
        throw new Error(message);
      } finally {
        if (isMountedRef.current) setApplyingRecommendationId(null);
      }
    },
    [numericProyectoId]
  );

  // Inicialización y Suscripción STOMP
  useEffect(() => {
    if (!numericProyectoId) {
      return;
    }

    void cargarHistorial(0, true);

    const syncIaActivities = async () => {
      try {
        const response = await api.get<ActividadIAChat[]>(
          `/proyectos/${numericProyectoId}/chat/ia/estado`
        );
        if (isMountedRef.current) setIaActivities(response.data || []);
      } catch {
        if (isMountedRef.current) setIaActivities([]);
      }
    };

    const unsubStatus = stompService.addStatusListener((status) => {
      if (isMountedRef.current) {
        setConnectionStatus(status);
        if (status === 'Sincronizado') {
          void syncIaActivities();
          void sincronizarRecientes();
        }
        else setIaActivities([]);
      }
    });

    const destination = `/topic/proyectos/${numericProyectoId}/chat`;
    const unsubscribeStomp = stompService.subscribe(destination, (mensajeEntrante: MensajeChat) => {
      if (!isMountedRef.current || !mensajeEntrante || !mensajeEntrante.id) return;

      setMensajes((prev) => {
        const index = prev.findIndex((m) => m.id === mensajeEntrante.id);
        if (index >= 0) {
          const actualizados = [...prev];
          actualizados[index] = mensajeEntrante;
          return actualizados;
        }
        return [...prev, mensajeEntrante];
      });
    });

    const unsubscribeIaStatus = stompService.subscribe(
      `/topic/proyectos/${numericProyectoId}/chat/estado-ia`,
      (activity: ActividadIAChat) => {
        if (!isMountedRef.current || !activity?.solicitudId) return;
        setIaActivities((previous) => {
          const withoutCurrent = previous.filter((item) => item.solicitudId !== activity.solicitudId);
          return activity.estado === 'INICIO' ? [...withoutCurrent, activity] : withoutCurrent;
        });
      }
    );

    const watchdog = setInterval(() => {
      const cutoff = Date.now() - 3 * 60 * 1000;
      setIaActivities((previous) => previous.filter((activity) => {
        const timestamp = new Date(activity.fechaHora).getTime();
        return Number.isFinite(timestamp) && timestamp >= cutoff;
      }));
    }, 15000);

    return () => {
      unsubStatus();
      unsubscribeStomp();
      unsubscribeIaStatus();
      clearInterval(watchdog);
      setIaActivities([]);
    };
  }, [numericProyectoId, cargarHistorial, sincronizarRecientes]);

  return {
    mensajes,
    loading,
    loadingMore,
    hasMore,
    sending,
    sendingIA,
    iaActivities,
    applyingRecommendationId,
    error,
    connectionStatus,
    enviarMensaje,
    enviarMensajeConAdjuntos,
    consultarIA,
    elegirAlternativa,
    descartarAlternativa,
    aplicarRecomendacion,
    descartarRecomendacion,
    revalidarRecomendacion,
    aplicarCompatibles,
    cargarMas,
    recargar,
  };
}
