import { useEffect, useRef, useState, useCallback } from 'react';

export type VoiceState =
  | 'inactivo'
  | 'escuchando'
  | 'procesando'
  | 'comando_reconocido'
  | 'error'
  | 'permiso_denegado'
  | 'no_soportado';

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

export function useVoiceRecognition(onFinalTranscript?: (transcript: string) => void) {
  const [state, setState] = useState<VoiceState>('inactivo');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalProcessedRef = useRef(false);
  const activeTranscriptRef = useRef('');

  // Comprobar soporte de Web Speech API
  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar si ya estaba detenido
      }
    }
  }, []);

  const cancelVoice = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignorar
      }
      recognitionRef.current = null;
    }
    setState('inactivo');
    setTranscript('');
    setErrorMessage('');
    finalProcessedRef.current = false;
    activeTranscriptRef.current = '';
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setState('no_soportado');
      setErrorMessage(
        'El reconocimiento de voz Web Speech API no está disponible en este navegador. Utiliza Google Chrome o Microsoft Edge en Android o escritorio.'
      );
      return;
    }

    // Limpiar instancia previa
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignorar
      }
      recognitionRef.current = null;
    }

    const SpeechRecognitionApi: BrowserSpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'es-ES';
    recognition.continuous = false; // Detenerse tras el comando (no mantener grabando permanentemente)
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    finalProcessedRef.current = false;
    activeTranscriptRef.current = '';
    setTranscript('');
    setErrorMessage('');
    setState('escuchando');

    recognition.onstart = () => {
      setState('escuchando');
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let current = '';
      let isFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }

      const cleanCurrent = current.trim();
      activeTranscriptRef.current = cleanCurrent;
      setTranscript(cleanCurrent);

      if (isFinal && cleanCurrent && !finalProcessedRef.current) {
        finalProcessedRef.current = true;
        setState('procesando');
        if (onFinalTranscript) {
          onFinalTranscript(cleanCurrent);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      if (event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState('permiso_denegado');
        setErrorMessage(
          'Permiso al micrófono denegado. Por favor, concede acceso al micrófono en la barra de direcciones o ajustes del navegador.'
        );
        return;
      }

      if (event.error === 'no-speech') {
        setState('error');
        setErrorMessage('No se detectó voz. Vuelve a pulsar el micrófono e intenta hablar claramente.');
        return;
      }

      if (event.error === 'network') {
        setState('error');
        setErrorMessage(
          'Error de red en el servicio de reconocimiento de voz. Nota: Web Speech API suele requerir conexión a internet.'
        );
        return;
      }

      setState('error');
      setErrorMessage(`Ocurrió un error en el reconocimiento de voz (${event.error}). Intenta nuevamente.`);
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      // Si terminó sin haber marcado final pero tenemos texto acumulado
      if (activeTranscriptRef.current && !finalProcessedRef.current) {
        finalProcessedRef.current = true;
        setState('procesando');
        if (onFinalTranscript) {
          onFinalTranscript(activeTranscriptRef.current);
        }
      } else if (!activeTranscriptRef.current && !finalProcessedRef.current) {
        // Se detuvo sin capturar texto
        setState(prev => (prev === 'escuchando' ? 'inactivo' : prev));
      }
    };

    try {
      recognition.start();
    } catch (err) {
      recognitionRef.current = null;
      setState('error');
      setErrorMessage('No se pudo iniciar el micrófono. Revisa los permisos del navegador.');
    }
  }, [isSupported, onFinalTranscript]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorar
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    state,
    setState,
    transcript,
    setTranscript,
    errorMessage,
    setErrorMessage,
    isSupported,
    startListening,
    stopListening,
    cancelVoice
  };
}
