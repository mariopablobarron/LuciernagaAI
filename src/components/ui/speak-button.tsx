"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";

/**
 * Botón "escuchar" — lee el texto en voz alta.
 *
 * Estrategia:
 *  - Si `preferElevenLabs=true` y el endpoint /api/voice/tts responde,
 *    reproducimos la voz HD del mentor (Eva Dorado por default).
 *  - Si ese fetch falla (quota agotada, sin red, timeout, etc.), fallback
 *    transparente al `speechSynthesis` nativo del navegador. No rompe.
 *  - Si el navegador tampoco soporta synth, el componente NO renderiza
 *    nada (degrade silencioso).
 *
 * El fallback es importante: la cuota ElevenLabs del plan Creator es
 * limitada (~250k chars/mes). Cuando se agote, la voz baja a sintética
 * del SO pero el botón sigue funcionando.
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

type SpeakState = "idle" | "loading" | "playing-hd" | "playing-native" | "error";

export function SpeakButton({
  text,
  lang = "es-ES",
  className,
  preferElevenLabs = false,
}: {
  text: string;
  lang?: string;
  className?: string;
  /**
   * Si true, intenta usar /api/voice/tts para voz HD (ElevenLabs).
   * Si la llamada falla por cualquier razón (red, quota, etc.), cae
   * silenciosamente al synth nativo del navegador.
   */
  preferElevenLabs?: boolean;
}) {
  const [synthSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
  });
  const [state, setState] = useState<SpeakState>("idle");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup al desmontar — para audio HD y synth nativo.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      abortRef.current?.abort();
    };
  }, []);

  // Reproducción nativa (fallback siempre disponible si el synth está).
  const playNative = useCallback((cleaned: string) => {
    if (!synthSupported) {
      setState("error");
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.lang = lang;
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setState("idle");
    utter.onerror = () => setState("idle");
    utterRef.current = utter;
    setState("playing-native");
    synth.speak(utter);
  }, [lang, synthSupported]);

  // Reproducción HD (ElevenLabs). Si falla, llama a playNative.
  const playHD = useCallback(async (cleaned: string) => {
    setState("loading");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      setState("playing-hd");
      await audio.play();
    } catch (err) {
      // Fallback transparente al synth nativo.
      if (err instanceof DOMException && err.name === "AbortError") {
        setState("idle");
        return;
      }
      playNative(cleaned);
    }
  }, [playNative]);

  const handleClick = useCallback(() => {
    // Si ya está reproduciendo, parar todo.
    if (state === "playing-hd" || state === "playing-native" || state === "loading") {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
      audioRef.current?.pause();
      abortRef.current?.abort();
      setState("idle");
      return;
    }

    const cleaned = stripMarkdown(text || "");
    if (!cleaned) return;

    if (preferElevenLabs) {
      void playHD(cleaned);
    } else {
      playNative(cleaned);
    }
  }, [state, text, preferElevenLabs, playHD, playNative]);

  // Si el navegador no soporta NADA, no renderizamos. El usuario verá un
  // chat sin botón de escuchar — preferible a un botón roto.
  if (!synthSupported && !preferElevenLabs) return null;

  const isActive = state === "playing-hd" || state === "playing-native";
  const isLoading = state === "loading";
  const isHD = state === "playing-hd";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isActive ? "Detener lectura" : "Escuchar respuesta"}
      title={isActive ? "Detener lectura" : (preferElevenLabs ? "Escuchar (voz HD)" : "Escuchar respuesta")}
      className={className ?? "p-2 transition-opacity"}
    >
      {isLoading ? (
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-fuchsia-400" />
      ) : isActive ? (
        <VolumeX className={`h-3.5 w-3.5 ${isHD ? "text-fuchsia-400" : "text-fuchsia-300"}`} />
      ) : (
        <Volume2 className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
      )}
    </button>
  );
}
