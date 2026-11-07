import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  MessageSquare, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  X,
  ChevronUp,
  Sparkles,
  Info,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Paperclip,
  Mic,
  AudioLines,
  Square,
  Trash2,
  FileText
} from 'lucide-react';
import { useProjectChat } from '../../hooks/useProjectChat';
import { useAuthStore } from '../../store/authStore';
import type { MensajeChat, RecomendacionUml } from '../../types/chat';
import ChatAttachmentView from './ChatAttachmentView';
import { chatDateKey, formatChatDateLabel, formatChatTime } from '../../utils/chatDateTime';

interface ProjectChatProps {
  proyectoId: number | string | undefined;
  proyectoNombre?: string;
  diagramaId?: number | string;
  diagramaNombre?: string;
  variant?: 'embedded' | 'drawer' | 'compact';
  onClose?: () => void;
  className?: string;
  hasUnsavedChanges?: boolean;
}

export default function ProjectChat({
  proyectoId,
  proyectoNombre,
  diagramaId,
  diagramaNombre,
  variant = 'embedded',
  onClose,
  className = '',
  hasUnsavedChanges = false,
}: ProjectChatProps) {
  const { user } = useAuthStore();
  const {
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
    aplicarRecomendacion,
    cargarMas,
    recargar,
  } = useProjectChat(proyectoId);

  const [inputTexto, setInputTexto] = useState('');
  const [modoIA, setModoIA] = useState<boolean>(false);
  const [revisandoRecomendacion, setRevisandoRecomendacion] = useState<RecomendacionUml | null>(null);
  const [revisandoMensajeId, setRevisandoMensajeId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview?: string }>>([]);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const appliedRecommendationIds = useMemo(() => new Set(
    mensajes
      .filter((message) => message.metadatos?.evento === 'recomendacion_aplicada')
      .map((message) => message.metadatos?.recomendacionId)
      .filter((id): id is string => Boolean(id))
  ), [mensajes]);

  const openRecommendationReview = (recommendation: RecomendacionUml, messageId: number) => {
    setLocalError(null);
    setRevisandoRecomendacion(recommendation);
    setRevisandoMensajeId(messageId);
  };

  const closeRecommendationReview = () => {
    setRevisandoRecomendacion(null);
    setRevisandoMensajeId(null);
  };

  const handleApplyRecommendation = async () => {
    if (!revisandoRecomendacion?.id || !revisandoMensajeId) return;
    if (hasUnsavedChanges) {
      setLocalError('Guarda o descarta tus cambios locales antes de aplicar una recomendación. No se sobrescribió el canvas.');
      return;
    }
    try {
      await aplicarRecomendacion(revisandoMensajeId, revisandoRecomendacion.id);
      closeRecommendationReview();
    } catch (applyError: any) {
      setLocalError(applyError.message || 'No se pudo aplicar la recomendación UML.');
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // Formateador de hora
  const formatTime = formatChatTime;

  // Formateador de fecha para divisores
  const formatDateLabel = formatChatDateLabel;

  // Formateador amigable de tipos de cambio
  const formatTipoCambio = (tipo: string) => {
    switch (tipo) {
      case 'AGREGAR_ATRIBUTO':
        return '+ Atributo';
      case 'MODIFICAR_ATRIBUTO':
        return '~ Modificar Atributo';
      case 'ELIMINAR_ATRIBUTO':
        return '- Eliminar Atributo';
      case 'AGREGAR_METODO':
        return '+ Método';
      case 'MODIFICAR_METODO':
        return '~ Modificar Método';
      case 'ELIMINAR_METODO':
        return '- Eliminar Método';
      case 'AGREGAR_RELACION':
        return '+ Relación';
      case 'MODIFICAR_RELACION':
        return '~ Modificar Relación';
      case 'ELIMINAR_RELACION':
        return '- Eliminar Relación';
      case 'RENOMBRAR_CLASE':
        return 'Renombrar Clase';
      default:
        return tipo || 'Cambio UML';
    }
  };

  // Formateador sintáctico para cambio propuesto
  const formatCambioPropuesto = (rec: RecomendacionUml) => {
    const c = rec.cambioPropuesto;
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (c.nombre && c.tipo) {
      const vis = c.visibilidad ? ` [${c.visibilidad}]` : '';
      return `${c.nombre}: ${c.tipo}${vis}`;
    }
    if (c.origen && c.destino) {
      return `${c.origen} ➔ ${c.destino} (${c.tipo || rec.tipoCambio})`;
    }
    try {
      return JSON.stringify(c, null, 1).replace(/[{}"]/g, '').trim();
    } catch {
      return String(c);
    }
  };

  // Agrupar mensajes con separadores de fecha
  const itemsConSeparadores = useMemo(() => {
    const items: Array<{ type: 'date'; label: string; key: string } | { type: 'message'; data: MensajeChat }> = [];
    let ultimaFecha = '';

    mensajes.forEach((m) => {
      const fechaClave = chatDateKey(m.fechaHora);
      if (fechaClave && fechaClave !== ultimaFecha) {
        items.push({
          type: 'date',
          label: formatDateLabel(m.fechaHora),
          key: `date-${fechaClave}-${m.id}`,
        });
        ultimaFecha = fechaClave;
      }
      items.push({ type: 'message', data: m });
    });

    return items;
  }, [mensajes]);

  // Manejo de scroll al cargar mensajes anteriores
  const handleCargarMas = async () => {
    if (!messagesContainerRef.current) {
      await cargarMas();
      return;
    }
    previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
    isAutoScrollEnabledRef.current = false;
    await cargarMas();
  };

  // Mantener posición de scroll al prepender mensajes
  useEffect(() => {
    if (previousScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const diff = messagesContainerRef.current.scrollHeight - previousScrollHeightRef.current;
      messagesContainerRef.current.scrollTop += diff;
      previousScrollHeightRef.current = 0;
    }
  }, [mensajes.length]);

  // Auto-scroll al fondo al recibir nuevos mensajes si el usuario estaba cerca del fondo
  useEffect(() => {
    if (isAutoScrollEnabledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes.length, sendingIA]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    isAutoScrollEnabledRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  const clearVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
    setVoiceFile(null);
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreviewUrl(null);
  };

  const startRecording = async () => {
    setLocalError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setLocalError('Este navegador no admite grabación de notas de voz. Puedes adjuntar un audio existente.');
      return;
    }
    try {
      clearVoiceRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualType });
        const extension = actualType.includes('ogg') ? 'ogg' : actualType.includes('mp4') ? 'm4a' : 'webm';
        setVoiceFile(new File([blob], `nota-voz-${Date.now()}.${extension}`, { type: actualType }));
        setVoicePreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch (err: any) {
      setLocalError(err?.name === 'NotAllowedError'
        ? 'No se concedió permiso para usar el micrófono.'
        : 'No se pudo iniciar la grabación de audio.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const startDictation = () => {
    setLocalError(null);
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setLocalError('El dictado no está disponible en este navegador. Puedes escribir o pegar el mensaje.');
      return;
    }
    const recognition = new Recognition();
    const baseText = inputTexto.trim();
    recognition.lang = navigator.language || 'es-BO';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setInputTexto(`${baseText}${baseText ? ' ' : ''}${transcript}`.trimStart());
    };
    recognition.onerror = () => setLocalError('No se pudo completar el dictado. Puedes escribir el mensaje manualmente.');
    recognition.onend = () => setDictating(false);
    setDictating(true);
    recognition.start();
  };

  const selectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const remaining = Math.max(0, 5 - pendingFiles.length - (voiceFile ? 1 : 0));
    const accepted = selected.slice(0, remaining).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setLocalError(`${file.name} supera el límite de 10 MiB.`);
        return false;
      }
      return true;
    });
    setPendingFiles((previous) => [...previous, ...accepted.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))]);
    event.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((previous) => {
      const item = previous[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const texto = inputTexto.trim();
    const archivos = [...pendingFiles.map((item) => item.file), ...(voiceFile ? [voiceFile] : [])];
    if ((!texto && archivos.length === 0) || sending || sendingIA || recording) return;

    setLocalError(null);
    try {
      isAutoScrollEnabledRef.current = true;

      if (modoIA) {
        if (archivos.length > 0) {
          throw new Error('Los adjuntos no se envían automáticamente a la IA. Cambia a Equipo para compartirlos.');
        }
        if (!diagramaId) {
          throw new Error('Para consultar a la IA, debes tener un diagrama abierto en el editor UML.');
        }
        await consultarIA(texto, Number(diagramaId));
      } else if (archivos.length > 0) {
        setUploadProgress(0);
        await enviarMensajeConAdjuntos(texto, archivos, {
          origen: voiceFile ? 'nota_voz' : 'adjunto_chat',
          duracionSegundos: voiceFile ? recordingSeconds : undefined,
        }, setUploadProgress);
      } else {
        await enviarMensaje(texto);
      }

      setInputTexto('');
      pendingFiles.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      setPendingFiles([]);
      clearVoiceRecording();
      setUploadProgress(null);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      setLocalError(err.message || 'No se pudo enviar el mensaje');
      setUploadProgress(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const getInitials = (nombreCompleto?: string | null) => {
    if (!nombreCompleto) return 'U';
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].slice(0, 2).toUpperCase();
  };

  const isCurrentUser = (m: MensajeChat) => {
    if (!user) return false;
    if (m.emisorId && user.id && m.emisorId === user.id) return true;
    if (m.emisorNombre && user.nombre && m.emisorNombre.toLowerCase().includes(user.nombre.toLowerCase())) {
      return true;
    }
    return false;
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={`flex flex-col bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-lila-light/60 shadow-xs overflow-hidden h-full ${className}`}
      style={isCompact ? undefined : { minHeight: '420px' }}
    >
      {/* HEADER DEL CHAT */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white/95 border-b border-lila-light/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-lila-light/60 text-lila-main flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-text-dark tracking-tight truncate flex items-center gap-1.5">
              <span>Chat del proyecto</span>
              {proyectoNombre && (
                <span className="hidden sm:inline text-xs font-semibold text-gray-400 truncate max-w-[140px]">
                  · {proyectoNombre}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'Sincronizado'
                      ? 'bg-green-500 animate-pulse'
                      : connectionStatus === 'Conectando...' || connectionStatus === 'Reconectando...'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-semibold">
                  {connectionStatus === 'Sincronizado'
                    ? 'En vivo'
                    : connectionStatus === 'Conectando...'
                    ? 'Conectando...'
                    : connectionStatus === 'Reconectando...'
                    ? 'Reconectando...'
                    : 'Sin conexión'}
                </span>
              </span>

              {diagramaId && (
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded-md font-semibold text-[10px] border border-purple-200/50">
                  <Layers className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{diagramaNombre || `Diagrama #${diagramaId}`}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => recargar()}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/30 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Recargar mensajes"
            aria-label="Recargar mensajes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-lila-main' : ''}`} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-text-dark hover:bg-gray-100 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Cerrar chat"
              aria-label="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MENSAJE DE ERROR GLOBAL O LOCAL */}
      {(error || localError) && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-between text-xs text-red-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium truncate">{localError || error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              recargar();
            }}
            className="text-[11px] font-bold underline hover:text-red-900 ml-2 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* CUERPO DEL CHAT / MENSAJES */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-3.5 custom-scrollbar bg-gradient-to-b from-bg-main/30 to-transparent min-h-0 min-w-0"
      >
        {/* BOTÓN PARA CARGAR MENSAJES ANTERIORES */}
        {hasMore && (
          <div className="flex justify-center pt-1 pb-2">
            <button
              type="button"
              onClick={handleCargarMas}
              disabled={loadingMore}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-lila-main bg-lila-light/40 hover:bg-lila-light/70 border border-lila-light/70 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cargando anteriores...</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Cargar mensajes anteriores</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* SPINNER DE CARGA INICIAL */}
        {loading && mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <div className="w-8 h-8 border-3 border-lila-main border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium">Cargando conversación del proyecto...</p>
          </div>
        ) : mensajes.length === 0 && iaActivities.length === 0 ? (
          /* ESTADO VACÍO */
          <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-lila-light to-pink-light rounded-2xl flex items-center justify-center text-lila-main mb-3 shadow-inner">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-text-dark">Aún no hay mensajes</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs font-medium">
              Comunícate con tu equipo o activa <strong className="text-purple-700 font-bold">«Preguntar a la IA»</strong> para recibir recomendaciones inteligentes sobre el modelo UML.
            </p>
          </div>
        ) : (
          /* LISTA DE MENSAJES */
          itemsConSeparadores.map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.key} className="flex items-center my-3">
                  <div className="flex-1 border-t border-gray-200/60" />
                  <span className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/80 rounded-full border border-gray-200/50 shadow-xs mx-2">
                    {item.label}
                  </span>
                  <div className="flex-1 border-t border-gray-200/60" />
                </div>
              );
            }

            const m = item.data;
            const isMe = isCurrentUser(m);
            const isSystem = m.tipoEmisor === 'SISTEMA';
            const isIA = m.tipoEmisor === 'IA';
            const isSolicitudIA = m.metadatos?.origen === 'chat_ia';
            const recomendaciones = m.metadatos?.recomendaciones || [];

            /* 1. MENSAJE DE SISTEMA */
            if (isSystem) {
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <div className="px-3.5 py-2 rounded-2xl bg-amber-50/90 text-amber-900 text-xs font-medium border border-amber-200/80 flex items-start gap-2 max-w-[90%] shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="leading-snug">{m.contenido}</p>
                      {m.metadatos?.detalle && (
                        <p className="text-[10px] text-amber-700/80 mt-1 font-mono break-all line-clamp-2">
                          {m.metadatos.detalle}
                        </p>
                      )}
                      <span className="text-[10px] text-amber-600/70 mt-0.5 block">{formatTime(m.fechaHora)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* 2. MENSAJE DE IA */
            if (isIA) {
              return (
                <div key={m.id} className="flex gap-2.5 items-start justify-start my-1.5">
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md border-2 border-white mt-1"
                    title="UMLForge IA"
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <div className="flex flex-col items-start min-w-0 max-w-[calc(100%-2.5rem)] sm:max-w-[92%] xl:max-w-[88%]">
                    {/* Header IA */}
                    <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px] flex-wrap">
                      <span className="font-bold text-purple-800 flex items-center gap-1">
                        <span>UMLForge IA</span>
                      </span>
                      {m.metadatos?.proveedor && (
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200/80 shadow-2xs">
                          ✨ {m.metadatos.proveedor}
                        </span>
                      )}
                      {m.metadatos?.diagramaId && (
                        <span className="text-[10px] text-gray-400 font-semibold">
                          · Diagrama #{m.metadatos.diagramaId}
                        </span>
                      )}
                    </div>

                    {/* Burbuja de contenido IA */}
                    <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-xs text-xs sm:text-sm font-medium leading-relaxed bg-gradient-to-br from-purple-50/90 via-white to-pink-50/30 text-purple-950 border border-purple-200/80 space-y-3">
                      <p className="whitespace-pre-wrap">{m.contenido}</p>

                      {/* TARJETAS DE RECOMENDACIONES ESTRUCTURADAS */}
                      {recomendaciones.length > 0 && (
                        <div className="pt-2 border-t border-purple-100/90 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>Recomendaciones propuestas ({recomendaciones.length}):</span>
                            </span>
                          </div>

                          <div className="space-y-2">
                            {recomendaciones.map((rec, rIdx) => (
                              <div
                                key={rec.id || rIdx}
                                className="p-2.5 sm:p-3 bg-white/95 rounded-xl border border-purple-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors min-w-0 overflow-hidden"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200/80 shrink-0">
                                    {formatTipoCambio(rec.tipoCambio)}
                                  </span>
                                  {rec.elementoAfectado?.nombre && (
                                    <span className="text-[11px] font-semibold text-gray-600 break-words min-w-0">
                                      {rec.elementoAfectado.tipo}: <strong className="text-gray-800">{rec.elementoAfectado.nombre}</strong>
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-medium text-gray-700 leading-snug">
                                  {rec.descripcion}
                                </p>

                                {rec.cambioPropuesto && (
                                  <div className="px-2 py-1 bg-gray-50 rounded-lg border border-gray-100 font-mono text-[11px] text-gray-700 whitespace-pre-wrap break-all max-h-24 overflow-auto">
                                    {formatCambioPropuesto(rec)}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                  <button
                                    type="button"
                                    onClick={() => openRecommendationReview(rec, m.id)}
                                    className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-lila-main bg-lila-light/25 hover:bg-lila-light/45 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Revisar recomendación</span>
                                  </button>

                                  {rec.id && appliedRecommendationIds.has(rec.id) ? (
                                    <span className="py-1.5 px-3 rounded-lg text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Aplicada
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openRecommendationReview(rec, m.id)}
                                      className="py-1.5 px-3 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 flex items-center justify-center gap-1"
                                    >
                                      <span>Aplicar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hora */}
                    <div className="px-1 mt-1 text-[10px] text-gray-400 font-medium">
                      <span>{formatTime(m.fechaHora)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* 3. MENSAJE HUMANO (USUARIO) */
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* AVATAR OTRO USUARIO */}
                {!isMe && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-lila-light to-pink-light text-lila-main flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 shadow-inner border border-white"
                    title={m.emisorNombre || 'Participante'}
                  >
                    {getInitials(m.emisorNombre)}
                  </div>
                )}

                {/* BURBUJA DE MENSAJE HUMANO */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                  {/* NOMBRE DEL EMISOR */}
                  <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px]">
                    <span
                      className={`font-bold truncate max-w-[160px] sm:max-w-[200px] ${
                        isMe ? 'text-gray-500' : 'text-lila-main'
                      }`}
                    >
                      {isMe ? 'Tú' : m.emisorNombre || 'Participante'}
                    </span>
                    {isSolicitudIA && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-md border border-purple-200/60">
                        <Sparkles className="w-2.5 h-2.5" /> Solicitud IA
                      </span>
                    )}
                  </div>

                  {/* CONTENIDO */}
                  <div
                    className={`px-4 py-2.5 rounded-2xl shadow-xs text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-pre-wrap ${
                      isMe
                        ? 'bg-gradient-to-r from-lila-main to-pink-main text-white rounded-br-xs'
                        : 'bg-white text-text-dark border border-lila-light/60 rounded-bl-xs'
                    }`}
                  >
                    {m.contenido && <p>{m.contenido}</p>}
                    {m.adjuntos?.map((adjunto) => (
                      <ChatAttachmentView key={adjunto.id} adjunto={adjunto} />
                    ))}
                  </div>

                  {/* HORA Y ESTADO */}
                  <div
                    className={`flex items-center gap-1 px-1 mt-1 text-[10px] text-gray-400 font-medium ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{formatTime(m.fechaHora)}</span>
                    {isMe && (
                      <span title={m.estado}>
                        {m.estado === 'ENVIADO' && <span className="text-gray-400">✓</span>}
                        {m.estado === 'COMPLETADO' && <span className="text-lila-main font-bold">✓✓</span>}
                        {m.estado === 'PROCESANDO' && <Clock className="w-2.5 h-2.5 animate-spin text-gray-400" />}
                        {m.estado === 'ERROR' && <AlertCircle className="w-2.5 h-2.5 text-red-500" />}
                      </span>
                    )}
                  </div>
                </div>

                {/* AVATAR USUARIO ACTUAL */}
                {isMe && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center font-bold text-[10px] sm:text-xs text-lila-main shrink-0 shadow-inner border border-white"
                    title={user?.nombre ? `${user.nombre} (Tú)` : 'Tú'}
                  >
                    {getInitials(user?.nombre)}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* INDICADOR EN TIEMPO REAL DE PROCESAMIENTO IA */}
        {iaActivities.map((activity) => (
          <div key={activity.solicitudId} className="flex gap-2.5 items-start justify-start animate-in fade-in duration-200" role="status" aria-live="polite">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md border-2 border-white mt-1">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex flex-col items-start max-w-[85%] sm:max-w-[78%]">
              <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px]">
                <span className="font-bold text-purple-800">UMLForge AI</span>
                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-full animate-pulse">
                  Pensando...
                </span>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs text-xs font-medium leading-relaxed bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-2.5">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-purple-700 font-semibold">
                  UMLForge AI está escribiendo… <span className="sr-only">Solicitud iniciada por {activity.usuarioNombre}</span>
                </span>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* SELECTOR DE MODO: EQUIPO VS IA */}
      <div className="px-3 pt-2 pb-1.5 bg-gray-50/70 border-t border-lila-light/30 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModoIA(false)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              !modoIA
                ? 'bg-white text-gray-800 shadow-2xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-lila-main" />
            <span>Equipo</span>
          </button>
          <button
            type="button"
            onClick={() => setModoIA(true)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              modoIA
                ? 'bg-gradient-to-r from-lila-main to-pink-main text-white shadow-2xs'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100/70 border border-purple-200/60'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${modoIA ? 'text-white' : 'text-purple-600'}`} />
            <span>Preguntar a la IA</span>
          </button>
        </div>

        {modoIA && (
          <div className="text-[11px] font-semibold text-purple-700 truncate flex items-center gap-1">
            {diagramaId ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                <span className="truncate max-w-[130px] sm:max-w-[180px]" title={diagramaNombre || `Diagrama #${diagramaId}`}>
                  {diagramaNombre || `Diagrama #${diagramaId}`}
                </span>
              </>
            ) : (
              <span className="text-amber-600 font-medium text-[10px]">Sin diagrama activo</span>
            )}
          </div>
        )}
      </div>

      {!modoIA && (pendingFiles.length > 0 || recording || voiceFile) && (
        <div className="px-3 py-2 bg-white border-t border-lila-light/30 space-y-2 shrink-0">
          {recording && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-bold text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Grabando nota de voz · {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={stopRecording} className="p-2 rounded-lg bg-red-600 text-white" title="Detener y revisar"><Square className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={clearVoiceRecording} className="p-2 rounded-lg bg-white text-red-600 border border-red-200" title="Cancelar grabación"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
          {voiceFile && voicePreviewUrl && !recording && (
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-3 py-2">
              <AudioLines className="w-4 h-4 text-lila-main shrink-0" />
              <audio src={voicePreviewUrl} controls preload="metadata" className="h-8 flex-1 min-w-0" aria-label="Revisar nota de voz antes de enviar" />
              <span className="text-[10px] text-gray-500 shrink-0">{recordingSeconds}s</span>
              <button type="button" onClick={clearVoiceRecording} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar nota de voz"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingFiles.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="relative flex items-center gap-2 min-w-[180px] max-w-[240px] rounded-xl border border-lila-light bg-gray-50 p-2">
                  {item.preview ? <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <FileText className="w-8 h-8 text-lila-main shrink-0" />}
                  <div className="min-w-0"><p className="text-[11px] font-bold truncate">{item.file.name}</p><p className="text-[10px] text-gray-500">{Math.ceil(item.file.size / 1024)} KB</p></div>
                  <button type="button" onClick={() => removePendingFile(index)} className="ml-auto p-1 text-red-500" aria-label={`Quitar ${item.file.name}`}><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          {uploadProgress !== null && <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-lila-main to-pink-main transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
        </div>
      )}

      {/* ÁREA DE ENVÍO DE MENSAJES */}
      <form
        onSubmit={handleSend}
        className={`p-2 sm:p-3 bg-white/95 border-t flex items-end gap-1 sm:gap-2 shrink-0 transition-colors min-w-0 ${
          modoIA ? 'border-purple-200/80 bg-purple-50/20' : 'border-lila-light/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.docx,.json,.xml,.xmi"
          onChange={selectFiles}
        />
        {!modoIA && (
          <div className="flex items-center gap-0 shrink-0">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || recording} className="p-2 sm:p-2.5 text-gray-500 hover:text-lila-main hover:bg-lila-light/30 rounded-xl disabled:opacity-40" title="Adjuntar archivo" aria-label="Adjuntar archivo">
              <Paperclip className="w-4 h-4" />
            </button>
            <button type="button" onClick={recording ? stopRecording : startRecording} disabled={sending || Boolean(voiceFile)} className={`p-2 sm:p-2.5 rounded-xl disabled:opacity-40 ${recording ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50'}`} title="Grabar audio" aria-label="Grabar audio">
              <Mic className="w-4 h-4" />
            </button>
            <button type="button" onClick={startDictation} disabled={sending || recording || dictating} className={`p-2 sm:p-2.5 rounded-xl disabled:opacity-40 ${dictating ? 'bg-purple-100 text-purple-700 animate-pulse' : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50'}`} title="Dictar mensaje" aria-label="Dictar mensaje">
              <AudioLines className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 relative min-w-0">
          <textarea
            rows={1}
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              modoIA
                ? 'Pregunta a la IA (ej: «Sugiere atributos para la clase Cliente»)...'
                : 'Escribe un mensaje para el equipo...'
            }
            disabled={sending || sendingIA}
            maxLength={10000}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl sm:rounded-2xl focus:outline-none transition-all font-medium text-text-dark text-xs sm:text-sm min-h-[44px] max-h-28 resize-y ${
              modoIA
                ? 'bg-purple-50/50 border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-500 placeholder-purple-400/80'
                : 'bg-gray-50/80 border-lila-light/60 focus:bg-white focus:ring-2 focus:ring-lila-main placeholder-gray-400'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={(!inputTexto.trim() && pendingFiles.length === 0 && !voiceFile) || sending || sendingIA || recording}
          className={`px-3 py-2.5 sm:px-5 sm:py-3 min-h-[44px] min-w-[44px] text-white font-bold rounded-xl sm:rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 ${
            modoIA
              ? 'bg-gradient-to-r from-purple-600 to-pink-500 shadow-purple-500/20'
              : 'bg-gradient-to-r from-lila-main to-pink-main shadow-pink-main/20'
          }`}
          title={modoIA ? 'Consultar a la IA' : 'Enviar mensaje'}
          aria-label={modoIA ? 'Consultar a la IA' : 'Enviar mensaje'}
        >
          {sending || sendingIA ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : modoIA ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline text-xs sm:text-sm">
            {modoIA ? 'Consultar' : 'Enviar'}
          </span>
        </button>
      </form>

      {/* MODAL PARA REVISAR RECOMENDACIÓN */}
      {revisandoRecomendacion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-2xl sm:rounded-3xl shadow-2xl border border-purple-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[88dvh] animate-in zoom-in-95 duration-150 min-w-0">
            {/* Encabezado del Modal */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-50 via-white to-pink-50 border-b border-purple-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Revisión de Recomendación UML</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Propuesta generada por la IA colaborativa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRecommendationReview}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Cerrar revisión"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-3 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4 text-xs min-w-0">
              {/* Metadatos de la recomendación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tipo de Cambio</span>
                  <span className="font-bold text-purple-700 text-xs">
                    {formatTipoCambio(revisandoRecomendacion.tipoCambio)}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Elemento Afectado</span>
                  <span className="font-bold text-gray-800 text-xs break-words block" title={revisandoRecomendacion.elementoAfectado?.nombre}>
                    {revisandoRecomendacion.elementoAfectado?.tipo}: {revisandoRecomendacion.elementoAfectado?.nombre}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción</span>
                <p className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-gray-800 leading-relaxed font-medium">
                  {revisandoRecomendacion.descripcion}
                </p>
              </div>

              {/* Vista previa textual del cambio */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Vista previa textual del cambio</span>
                  <span className="text-[10px] font-mono text-purple-600 lowercase">formato uml</span>
                </span>
                <div className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs overflow-auto space-y-1 max-h-52 min-w-0">
                  <div className="text-gray-400 text-[10px]">// Diagrama #{revisandoRecomendacion.diagramaId} (v{revisandoRecomendacion.versionDiagrama || 1})</div>
                  <div className="text-pink-400 font-semibold">{revisandoRecomendacion.elementoAfectado?.tipo} {revisandoRecomendacion.elementoAfectado?.nombre}:</div>
                  <div className="pl-3 text-green-300 font-bold bg-green-950/40 py-1 px-2 rounded border border-green-800/40">
                    {formatCambioPropuesto(revisandoRecomendacion)}
                  </div>
                </div>
              </div>

              {/* Nota de seguridad y colaboración */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2.5 text-[11px]">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Esta propuesta fue generada por el pipeline de IA para su revisión colaborativa.
                  La aplicación requiere confirmación explícita. El backend volverá a validar la recomendación original, la versión y tus permisos antes de modificar el diagrama.
                  {hasUnsavedChanges && <strong className="block mt-1">Primero guarda o descarta tus cambios locales.</strong>}
                </p>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="px-3 sm:px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeRecommendationReview}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => void handleApplyRecommendation()}
                disabled={hasUnsavedChanges || !revisandoRecomendacion.id || !revisandoMensajeId || applyingRecommendationId === revisandoRecomendacion.id || appliedRecommendationIds.has(revisandoRecomendacion.id)}
                title={hasUnsavedChanges ? 'Guarda o descarta tus cambios locales antes de aplicar' : 'Confirmar y aplicar la recomendación'}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-lila-main to-pink-main border border-purple-300 hover:opacity-90 disabled:text-gray-400 disabled:bg-gray-200 disabled:border-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{applyingRecommendationId === revisandoRecomendacion.id ? 'Aplicando…' : 'Confirmar y aplicar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
