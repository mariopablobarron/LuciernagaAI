"use client";

import { useEffect, useState } from "react";
import type { EmotionalStateType } from "./HomeCanvas";

interface CentralPromptProps {
  emotionalState: EmotionalStateType;
}

export default function CentralPrompt({ emotionalState }: CentralPromptProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);
  }, []);

  // Prompts dinámicas según estado emocional
  const prompts: Record<EmotionalStateType, { main: string; sub: string }> = {
    blocked: {
      main: "¿Qué estás evitando ahora mismo?",
      sub: "No lo pienses. Escríbelo.",
    },
    anxious: {
      main: "¿Qué está girando en tu cabeza?",
      sub: "Nombra lo que te inquieta.",
    },
    doubt: {
      main: "¿Qué no tienes claro?",
      sub: "Cuéntame qué duele.",
    },
    clarity: {
      main: "¿Qué necesitas hacer ahora?",
      sub: "Vamos a ponerlo en movimiento.",
    },
  };

  const currentPrompt = prompts[emotionalState];

  return (
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      {/* Glow effect de fondo */}
      <div className="pointer-events-none absolute -inset-32 rounded-full bg-radial-gradient from-emotion-clarity/20 via-emotion-clarity/5 to-transparent blur-3xl" />

      {/* Contenido */}
      <div className="relative space-y-4">
        {/* Pregunta principal */}
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl drop-shadow-lg">
          {currentPrompt.main}
        </h1>

        {/* Subtexto */}
        <p className="text-lg text-white/60 sm:text-xl drop-shadow-md">
          {currentPrompt.sub}
        </p>

        {/* Indicador visual sutil */}
        <div className="flex items-center justify-center gap-2 pt-6">
          <div className="h-1 w-1 rounded-full bg-white/40 animate-pulse" />
          <div className="h-1 w-1 rounded-full bg-white/40 animate-pulse [animation-delay:100ms]" />
          <div className="h-1 w-1 rounded-full bg-white/40 animate-pulse [animation-delay:200ms]" />
        </div>
      </div>
    </div>
  );
}
