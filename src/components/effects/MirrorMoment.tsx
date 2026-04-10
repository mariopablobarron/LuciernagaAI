"use client";

import { useState } from "react";
import MirrorReveal from "@/components/effects/MirrorReveal";

type MirrorMomentType =
  | "return"        // Vuelve tras días inactivo
  | "action_done"   // Acaba de completar una acción
  | "weekly"        // Check-in semanal
  | "pre_goal"      // Antes de crear un objetivo
  | "pre_impulso";  // Antes del Modo Impulso

interface MirrorMomentProps {
  type: MirrorMomentType;
  context?: string; // Contexto extra (nombre de la acción completada, días ausente, etc.)
  onDismiss?: () => void;
  className?: string;
}

const MOMENTS: Record<MirrorMomentType, { prompt: string; buildPrompt?: (ctx: string) => string }> = {
  return: {
    prompt: "¿Qué te alejó?",
    buildPrompt: (days) =>
      `Llevas ${days} días sin entrar. ¿Qué te alejó?`,
  },
  action_done: {
    prompt: "¿Qué ha cambiado en ti después de hacerlo?",
    buildPrompt: (action) =>
      `Acabas de completar: "${action}". ¿Qué ha cambiado en ti?`,
  },
  weekly: {
    prompt: "¿Cómo fue tu semana en una frase?",
  },
  pre_goal: {
    prompt: "¿Qué quieres cambiar de verdad?",
  },
  pre_impulso: {
    prompt: "¿Qué crees que te impide avanzar?",
  },
};

async function fetchReframe(text: string): Promise<string> {
  try {
    const res = await fetch("/api/reframe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    const data = (await res.json()) as { reframed?: string };
    return data.reframed ?? "Hay algo detrás de lo que dices que merece atención.";
  } catch {
    return "Hay algo detrás de lo que dices que merece atención.";
  }
}

export default function MirrorMoment({
  type,
  context,
  onDismiss,
  className,
}: MirrorMomentProps) {
  const [dismissed, setDismissed] = useState(false);
  const moment = MOMENTS[type];

  if (dismissed) return null;

  const prompt = context && moment.buildPrompt
    ? moment.buildPrompt(context)
    : moment.prompt;

  return (
    <div className={`relative ${className ?? ""}`}>
      {onDismiss && (
        <button
          type="button"
          onClick={() => { setDismissed(true); onDismiss(); }}
          className="absolute top-2 right-2 z-10 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Saltar
        </button>
      )}
      <MirrorReveal
        prompt={prompt}
        onSubmit={fetchReframe}
      />
    </div>
  );
}
