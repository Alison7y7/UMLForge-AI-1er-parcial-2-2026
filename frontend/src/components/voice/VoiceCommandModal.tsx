import { Mic, MicOff, AlertCircle, CheckCircle2, Sparkles, X, RotateCcw, Volume2, ShieldAlert } from 'lucide-react';
import type { VoiceState } from '../../hooks/useVoiceRecognition';
import type { VoiceCommand } from '../../services/voiceCommandInterpreter';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceState: VoiceState;
  transcript: string;
  command: VoiceCommand | null;
  errorMessage: string;
  isSupported: boolean;
  canEdit: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onConfirmCommand: (command: VoiceCommand) => void;
  onRetry: () => void;
}

export default function VoiceCommandModal({
  isOpen,
  onClose,
  voiceState,
  transcript,
  command,
  errorMessage,
  isSupported,
  canEdit,
  onStartListening,
  onStopListening,
  onConfirmCommand,
  onRetry
}: VoiceCommandModalProps) {
  if (!isOpen) return null;

  const requiresPermissionAndDenied = command?.requierePermisoEdicion && !canEdit;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
        className="flex max-h-[92dvh] sm:max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-lila-light/50"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
              voiceState === 'escuchando' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-lila-light/40 text-lila-main'
            }`}>
              {voiceState === 'escuchando' ? <Mic className="w-5 h-5 animate-bounce" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="voice-modal-title" className="text-base sm:text-lg font-bold text-gray-800">
                Control por Voz UML
              </h2>
              <p className="text-xs text-gray-500">
                {voiceState === 'escuchando' ? 'Escuchando comando...' : 'Interactúa con el diagrama mediante voz'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl transition-colors"
            aria-label="Cerrar modal de voz"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* ESTADO: NO SOPORTADO */}
          {(!isSupported || voiceState === 'no_soportado') && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Reconocimiento de voz no soportado</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {errorMessage || 'Este navegador no soporta Web Speech API. Te recomendamos utilizar Google Chrome o Microsoft Edge en Android o PC para habilitar los comandos de voz.'}
              </p>
            </div>
          )}

          {/* ESTADO: PERMISO DENEGADO */}
          {voiceState === 'permiso_denegado' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <MicOff className="w-5 h-5 text-red-600 shrink-0" />
                <span>Permiso de micrófono denegado</span>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                {errorMessage || 'El navegador no tiene permiso para acceder al micrófono. Para solucionarlo, pulsa el candado en la barra de direcciones y permite el uso del micrófono.'}
              </p>
              <button
                onClick={onStartListening}
                className="w-full py-2.5 min-h-[44px] bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" /> Solicitar permiso nuevamente
              </button>
            </div>
          )}

          {/* ESTADO: ERROR */}
          {voiceState === 'error' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Error en el comando de voz</span>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                {errorMessage || 'No se pudo interpretar el comando de voz o no se detectó audio.'}
              </p>
              <button
                onClick={onRetry}
                className="w-full py-2.5 min-h-[44px] bg-lila-main text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" /> Reintentar comando
              </button>
            </div>
          )}

          {/* ESTADO: ESCUCHANDO */}
          {voiceState === 'escuchando' && (
            <div className="space-y-4 py-3 text-center">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping"></div>
                <div className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg">
                  <Mic className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Escuchando con el micrófono...</p>
                <p className="text-xs text-gray-500 mt-0.5">Habla con claridad cerca del dispositivo</p>
              </div>

              {/* Transcripción en tiempo real */}
              <div className="min-h-[52px] bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center justify-center text-center">
                {transcript ? (
                  <span className="text-sm font-semibold text-lila-main italic">«{transcript}»</span>
                ) : (
                  <span className="text-xs text-gray-400 italic">Esperando que hables...</span>
                )}
              </div>

              <button
                onClick={onStopListening}
                className="px-4 py-2 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2"
              >
                <MicOff className="w-4 h-4" /> Detener grabación
              </button>
            </div>
          )}

          {/* ESTADO: PROCESANDO */}
          {voiceState === 'procesando' && (
            <div className="py-6 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-lila-main border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-bold text-gray-800">Interpretando comando de voz...</p>
              <p className="text-xs text-gray-500 font-mono italic">«{transcript}»</p>
            </div>
          )}

          {/* ESTADO: COMANDO RECONOCIDO (CONFIRMACIÓN) */}
          {voiceState === 'comando_reconocido' && command && (
            <div className="space-y-4">
              <div className="bg-lila-light/10 border border-lila-light/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lila-main">
                  <Sparkles className="w-4 h-4 text-lila-main" />
                  <span>Comando interpretado</span>
                </div>
                
                <div className="bg-white p-3 rounded-xl border border-gray-200/80 space-y-1">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase">Texto capturado:</p>
                  <p className="text-sm font-medium text-gray-800 italic">«{command.rawTranscript}»</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200/80 space-y-1">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase">Acción a realizar:</p>
                  <p className="text-sm font-bold text-lila-main">{command.descripcion}</p>
                </div>

                {/* Si hay error de negocio (ej. clase destino no existe) */}
                {command.error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="font-semibold">{command.error}</span>
                  </div>
                )}

                {/* Si no tiene permisos de edición */}
                {requiresPermissionAndDenied && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Tu rol actual no tiene autorización para realizar modificaciones en este diagrama.</span>
                  </div>
                )}

                {!command.error && !requiresPermissionAndDenied && command.esModificacionDiagrama && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Se solicita tu confirmación antes de aplicar los cambios en el lienzo.</span>
                  </div>
                )}
              </div>

              {/* Botones de Confirmación y Cancelación */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center"
                >
                  Cancelar
                </button>
                {!command.error && !requiresPermissionAndDenied ? (
                  <button
                    type="button"
                    onClick={() => onConfirmCommand(command)}
                    className="flex-1 py-2.5 min-h-[44px] bg-gradient-to-r from-lila-main to-pink-main text-white text-xs sm:text-sm font-bold rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar y ejecutar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex-1 py-2.5 min-h-[44px] bg-lila-main text-white text-xs sm:text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Intentar otro comando
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ESTADO INACTIVO: GUÍA DE COMANDOS DISPONIBLES */}
          {voiceState === 'inactivo' && (
            <div className="space-y-4">
              <div className="text-center py-3">
                <button
                  onClick={onStartListening}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-lila-main to-pink-main text-white flex items-center justify-center mx-auto shadow-lg hover:scale-105 active:scale-95 transition-all"
                  aria-label="Iniciar grabación de voz"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <p className="text-sm font-bold text-gray-800 mt-3">Pulsa el botón para hablar</p>
                <p className="text-xs text-gray-500">Dicta uno de los comandos soportados en español</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/70 space-y-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ejemplos de comandos:</p>
                <ul className="space-y-1.5 text-xs text-gray-700">
                  <li className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-lila-main shrink-0"></span>
                    <span>«<strong>Crear clase Cliente</strong>»</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-lila-main shrink-0"></span>
                    <span>«<strong>Agregar atributo nombre de tipo String a Cliente</strong>»</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-lila-main shrink-0"></span>
                    <span>«<strong>Relacionar Cliente con Pedido mediante asociación</strong>»</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-lila-main shrink-0"></span>
                    <span>«<strong>Guardar diagrama</strong>»</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-lila-main shrink-0"></span>
                    <span>«<strong>Centrar diagrama</strong>»</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* AVISO IMPORTANTE SOBRE CONEXIÓN Y PRIVACIDAD */}
          <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 leading-normal">
            Nota: El reconocimiento de voz opera mediante la Web Speech API del navegador. La captura requiere permiso explícito y conexión a los servicios de voz del sistema o navegador.
          </div>
        </div>
      </div>
    </div>
  );
}
