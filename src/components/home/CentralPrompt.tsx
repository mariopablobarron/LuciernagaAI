"use client";

import { useEffect, useState } from "react";
import type { EmotionalStateType } from "./HomeCanvas";

interface CentralPromptProps {
  emotionalState: EmotionalStateType;
}

export default function CentralPrompt({ emotionalState }: CentralPromptProps) {
  const [isVisible] = useState(true);

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
    <div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Contenido */}
      <div className="relative space-y-6 max-w-2xl px-4">
        {/* Pregunta principal - tipografía bold y moderna */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white">
          {currentPrompt.main}
        </h1>

        {/* Subtexto - elegante y minimalista */}
        <p className="text-lg sm:text-xl text-white/70 font-medium leading-relaxed">
          {currentPrompt.sub}
        </p>

        {/* Separador visual minimalista */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <div className="h-px w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
          <div className="h-px w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
