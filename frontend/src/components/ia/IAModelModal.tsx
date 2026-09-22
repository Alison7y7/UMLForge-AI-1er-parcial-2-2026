import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Mic, MicOff, Sparkles, X } from 'lucide-react';
import type { UmlModelJson } from '../../types/uml';
import {
  generarModeloUml,
  obtenerMensajeErrorIA,
  type IAModelResponse
} from '../../services/iaService';

interface IAModelModalProps {
  diagramaId: number | null;
  hasExistingContent: boolean;
  onClose: () => void;
  onApply: (model: UmlModelJson) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const UML_EXAMPLES = [
  {
    icon: '📚',
    name: 'Biblioteca',
    prompt: 'Crear sistema de biblioteca con libros, usuarios y préstamos',
    classes: ['Libro', 'Usuario', 'Prestamo'],
  },
  {
    icon: '🐶',
    name: 'Veterinaria',
    prompt: 'Crear sistema de veterinaria con mascotas, dueños, veterinarios y consultas',
    classes: ['Mascota', 'Dueño', 'Veterinario', 'Consulta'],
  },
  {
    icon: '🎓',
    name: 'Universidad',
    prompt: 'Crear sistema universitario con estudiantes, cursos y profesores',
    classes: ['Estudiante', 'Curso', 'Profesor', 'Inscripcion'],
  },
  {
    icon: '🛒',
    name: 'Tienda',
    prompt: 'Crear sistema de tienda con productos, clientes y ventas',
    classes: ['Producto', 'Cliente', 'Venta', 'DetalleVenta'],
  },
  {
    icon: '🏥',
    name: 'Clínica Médica',
    prompt: 'Crear sistema de clínica con pacientes, médicos, citas e historiales médicos',
    classes: ['Paciente', 'Medico', 'Cita', 'HistorialMedico'],
  },
] as const;

export default function IAModelModal({
  diagramaId,
  hasExistingContent,
  onClose,
  onApply
}: IAModelModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<IAModelResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    }
  }, []);

  const summary = useMemo(() => {
    if (!result) return null;
    const classNames = new Map(result.modelo.clases.map(umlClass => [umlClass.id, umlClass.nombre]));
    return {
      classes: result.modelo.clases.length,
      attributes: result.modelo.clases.reduce(
        (total, umlClass) => total + umlClass.atributos.length,
        0
      ),
      relations: result.modelo.relaciones.length,
      classNames,
    };
  }, [result]);

  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError('Describe el sistema que deseas modelar.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await generarModeloUml({ diagramaId, prompt: cleanPrompt });
      setResult(response);
    } catch (requestError: unknown) {
      setError(obtenerMensajeErrorIA(requestError));
    } finally {
      setLoading(false);
    }
  };

  const finishSpeechProcessing = () => {
    setIsProcessingSpeech(true);
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    processingTimerRef.current = setTimeout(() => {
      setIsProcessingSpeech(false);
      processingTimerRef.current = null;
    }, 350);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    if (recognitionRef.current || isProcessingSpeech || loading) return;

    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const SpeechRecognitionApi =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setSpeechError(
        'Este navegador no soporta reconocimiento de voz. Usa una versión reciente de Chrome o Edge.'
      );
      return;
    }

    const recognition = new SpeechRecognitionApi();
    const basePrompt = prompt.trim();
    let recognizedText = '';
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    setSpeechError('');
    setIsProcessingSpeech(false);

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = event => {
      let transcript = '';
      let hasFinalResult = false;
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || '';
        hasFinalResult ||= event.results[index].isFinal;
      }
      recognizedText = transcript.trim();
      if (recognizedText) {
        const separator = basePrompt ? ' ' : '';
        setPrompt(`${basePrompt}${separator}${recognizedText}`.slice(0, 4000));
        setResult(null);
        setError('');
      }
      if (hasFinalResult) {
        setIsListening(false);
        setIsProcessingSpeech(true);
      }
    };
    recognition.onerror = event => {
      setIsListening(false);
      setIsProcessingSpeech(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError('No se concedió permiso para usar el micrófono.');
        return;
      }
      if (event.error === 'no-speech') {
        setSpeechError('No se detectó voz. Intenta hablar nuevamente.');
        return;
      }
      setSpeechError('El reconocimiento de voz falló. Intenta nuevamente.');
    };
    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (recognizedText) finishSpeechProcessing();
      else setIsProcessingSpeech(false);
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setSpeechError('No se pudo iniciar el reconocimiento de voz. Intenta nuevamente.');
    }
  };

  const handleClose = () => {
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    }
    onClose();
  };

  const handleApply = () => {
    if (!result) return;
    if (hasExistingContent) {
      const confirmed = window.confirm(
        'El diagrama actual contiene elementos.\n' +
        'El modelo generado reemplazará el contenido actual del lienzo.\n' +
        '¿Deseas continuar?'
      );
      if (!confirmed) return;
    }
    onApply(result.modelo);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ia-model-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lila-light/50 text-lila-main">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="ia-model-title" className="text-lg font-bold text-gray-800">
                Modelar con Inteligencia Artificial
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Describe el sistema y revisa el modelo antes de aplicarlo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Ejemplos de sistemas UML
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {UML_EXAMPLES.map(example => (
                <button
                  key={example.name}
                  type="button"
                  disabled={loading || isListening || isProcessingSpeech}
                  onClick={() => {
                    setPrompt(example.prompt);
                    setResult(null);
                    setError('');
                  }}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:border-lila-main hover:bg-lila-light/10 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center gap-2 font-bold text-gray-800">
                    <span className="text-lg" aria-hidden="true">{example.icon}</span>
                    {example.name}
                  </div>
                  <div className="mt-2 text-[11px] leading-relaxed text-gray-500">
                    <span className="font-bold text-gray-600">Prompt:</span> {example.prompt}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">
                    <span className="font-bold text-gray-600">Genera:</span>{' '}
                    {example.classes.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="ia-prompt" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Descripción del sistema
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={loading || isProcessingSpeech}
                  aria-pressed={isListening}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isListening
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-lila-light/30 text-lila-main hover:bg-lila-light/50'
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening
                    ? 'Escuchando...'
                    : isProcessingSpeech
                      ? 'Procesando texto...'
                      : 'Dictar descripción'}
                </button>
                <span className="text-xs text-gray-400">{prompt.length}/4000</span>
              </div>
            </div>
            <textarea
              id="ia-prompt"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              maxLength={4000}
              rows={5}
              disabled={loading || isListening || isProcessingSpeech}
              placeholder="Ejemplo: Crear un sistema de biblioteca con libros, usuarios y préstamos..."
              className="w-full resize-y rounded-lg border border-gray-200 bg-bg-main/50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-lila-main focus:bg-white focus:ring-2 focus:ring-lila-light/50 disabled:opacity-60"
            />
            {speechError && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {speechError}
              </div>
            )}
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-red-600" role="status">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                Escuchando. Habla con claridad; vuelve a pulsar para detener.
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-lila-light/60 bg-lila-light/10 px-4 py-4 text-sm font-medium text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-lila-main border-t-transparent" />
              Generando y validando el modelo UML...
            </div>
          )}

          {result && summary && (
            <div className="space-y-5 border-t border-gray-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-lila-main" />
                  <h3 className="font-bold text-gray-800">Vista previa del modelo</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-lila-light/40 px-3 py-1 text-lila-main">
                    Proveedor: {result.proveedor}
                  </span>
                  {result.tokensUsados !== null && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                      Tokens: {result.tokensUsados}
                    </span>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-bg-main px-3 py-3">
                  <dd className="text-lg font-bold text-gray-800">{summary.classes}</dd>
                  <dt className="text-gray-500">Clases</dt>
                </div>
                <div className="rounded-lg bg-bg-main px-3 py-3">
                  <dd className="text-lg font-bold text-gray-800">{summary.attributes}</dd>
                  <dt className="text-gray-500">Atributos</dt>
                </div>
                <div className="rounded-lg bg-bg-main px-3 py-3">
                  <dd className="text-lg font-bold text-gray-800">{summary.relations}</dd>
                  <dt className="text-gray-500">Relaciones</dt>
                </div>
              </dl>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Clases y atributos</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.modelo.clases.map(umlClass => (
                    <div key={umlClass.id} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="font-bold text-gray-800">{umlClass.nombre}</div>
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        {umlClass.atributos.length > 0 ? umlClass.atributos.map(attribute => (
                          <div key={attribute.id} className="font-mono">
                            {attribute.nombre}: {attribute.tipo}
                          </div>
                        )) : <div className="italic text-gray-400">Sin atributos</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Relaciones</h4>
                {result.modelo.relaciones.length > 0 ? (
                  <div className="space-y-2">
                    {result.modelo.relaciones.map(relation => (
                      <div key={relation.id} className="rounded-lg border border-gray-200 bg-bg-main px-3 py-2 text-xs text-gray-700">
                        <span className="font-bold">{summary.classNames.get(relation.origen) || relation.origen}</span>
                        <span className="mx-2 text-lila-main">— {relation.tipo} →</span>
                        <span className="font-bold">{summary.classNames.get(relation.destino) || relation.destino}</span>
                        <span className="ml-2 text-gray-500">
                          ({relation.multiplicidadOrigen} / {relation.multiplicidadDestino})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 px-3 py-3 text-sm italic text-gray-400">
                    El modelo no contiene relaciones.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          {!result ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || isListening || isProcessingSpeech || !prompt.trim()}
              className="flex items-center gap-2 rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generando...' : 'Generar modelo'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || isListening || isProcessingSpeech}
                className="px-4 py-2 text-sm font-semibold text-lila-main transition-colors hover:bg-lila-light/30 disabled:opacity-50"
              >
                Generar nuevamente
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Aplicar al diagrama
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
