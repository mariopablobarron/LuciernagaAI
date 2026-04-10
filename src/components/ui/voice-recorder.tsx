"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Mic } from "lucide-react";

interface VoiceRecorderProps {
  /** Función que se ejecuta cuando el navegador detecta texto nuevo */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorder({ onTranscript, disabled, className = "" }: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  // Referencia al objeto de reconocimiento de voz
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Verificamos si estamos en el navegador y si la API está soportada
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Se detiene al terminar la frase
      recognition.interimResults = true; // Para capturar mientras el usuario habla
      recognition.lang = "es-ES"; // Idioma español

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Pasamos el texto final (o el provisional) al componente padre
        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          onTranscript(currentText);
        }

        if (finalTranscript) {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Error en reconocimiento de voz:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Tu navegador no soporta voz — usa Chrome para esta funcion"
        className={`p-2.5 min-h-11 min-w-11 rounded-xl flex items-center justify-center bg-zinc-800/30 text-zinc-700 cursor-not-allowed ${className}`}
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Detener grabacion" : "Hablar para escribir"}
      className={`p-2.5 min-h-11 min-w-11 rounded-xl transition-all duration-300 flex items-center justify-center ${
        isListening
          ? "bg-fuchsia-600 text-white animate-pulse shadow-[0_0_15px_rgba(192,38,211,0.5)]"
          : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700"
      } ${className}`}
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
