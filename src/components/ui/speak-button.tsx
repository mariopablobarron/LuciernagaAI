"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Botón "escuchar" — usa la Web Speech Synthesis API nativa del navegador
 * para leer un texto en voz alta. Cero dependencias externas.
 *
 * Si el navegador no soporta speechSynthesis, no renderiza nada (degrade silent).
 *
 * - Idioma por defecto: es-ES.
 * - Click toggle: si ya está hablando, lo detiene.
 * - Limpia markdown básico antes de leer (asteriscos, _, links, headers).
 */

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // bloques código
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/__([^_]+)__/g, "$1") // bold alt
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/_([^_]+)_/g, "$1") // italic alt
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^#+\s+/gm, "") // headers
    .replace(/^[-*+]\s+/gm, "") // listas
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export function SpeakButton({
  text,
  lang = "es-ES",
  className,
}: {
  text: string;
  lang?: string;
  className?: string;
}) {
  const [supported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
  });
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Si el componente se desmonta, parar reproducción
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Si ya está hablando esta utterance, parar
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    // Cancelar cualquier otra reproducción en curso (ej. otro mensaje hablando)
    synth.cancel();

    const cleaned = stripMarkdown(text || "");
    if (!cleaned) return;

    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.lang = lang;
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;

    setSpeaking(true);
    synth.speak(utter);
  }, [speaking, text, lang]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? "Detener lectura" : "Escuchar respuesta"}
      title={speaking ? "Detener lectura" : "Escuchar respuesta"}
      className={className ?? "p-2 transition-opacity"}
    >
      {speaking ? (
        <VolumeX className="h-3.5 w-3.5 text-fuchsia-400" />
      ) : (
        <Volume2 className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
      )}
    </button>
  );
}
