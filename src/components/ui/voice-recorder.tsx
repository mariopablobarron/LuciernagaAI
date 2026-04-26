"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

type SpeechRecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};
type SpeechRecognitionErrorEvent = { error: string };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface VoiceRecorderProps {
  /**
   * Llamado SOLO con texto final (frases completadas). El componente NO emite
   * resultados interim para evitar duplicación de texto en el input.
   */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceRecorder({ onTranscript, disabled, className = "" }: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [denied, setDenied] = useState(false);
  // isSupported se deriva del entorno una sola vez en cliente — no es state.
  const isSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Guardamos el callback en una ref para evitar recrear la instancia en cada
  // render del padre (que típicamente pasa una closure nueva).
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Inicialización + cleanup. Solo se ejecuta una vez (sin deps).
  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    // Continuous=true: no se corta en la primera pausa, ideal para dictado
    // natural en español. interimResults=true para feedback visual rápido,
    // pero SOLO emitimos el texto final al padre.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Recorremos solo los resultados nuevos (a partir de resultIndex) y
      // emitimos al padre cada FRASE FINAL. Los interim se ignoran para no
      // duplicar texto en el input.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onTranscriptRef.current(text);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Errores comunes: "not-allowed" (permiso denegado), "no-speech",
      // "aborted", "network". Solo el primero requiere feedback al usuario;
      // los otros son ruido natural del dictado.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setDenied(true);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup: si el componente se desmonta mientras escucha, abortamos.
    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        setDenied(false);
        rec.start();
        setIsListening(true);
      } catch {
        // start() puede tirar si ya estaba activo. Ignoramos.
        setIsListening(false);
      }
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Tu navegador no soporta voz — usa Chrome, Edge o Safari"
        aria-label="Dictado por voz no disponible"
        className={`p-2.5 min-h-11 min-w-11 rounded-xl flex items-center justify-center bg-zinc-800/30 text-zinc-700 cursor-not-allowed ${className}`}
      >
        <MicOff className="w-5 h-5" aria-hidden="true" />
      </button>
    );
  }

  if (denied) {
    return (
      <button
        type="button"
        onClick={() => setDenied(false)}
        title="Permiso de micrófono denegado. Actívalo en los ajustes del navegador y vuelve a intentarlo."
        aria-label="Permiso de micrófono denegado"
        className={`p-2.5 min-h-11 min-w-11 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-colors ${className}`}
      >
        <MicOff className="w-5 h-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Detener dictado" : "Dictar mensaje por voz"}
      aria-label={isListening ? "Detener dictado" : "Dictar mensaje por voz"}
      aria-pressed={isListening}
      className={`p-2.5 min-h-11 min-w-11 rounded-xl transition-all duration-300 flex items-center justify-center ${
        isListening
          ? "bg-fuchsia-600 text-white animate-pulse shadow-[0_0_15px_rgba(192,38,211,0.5)]"
          : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700"
      } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <Mic className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
