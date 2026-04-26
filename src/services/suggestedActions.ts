/**
 * Sugerencias deterministas de chips post-respuesta del mentor.
 *
 * Inspirado en el patrón "Suggested actions" del template Vercel AI Chatbot,
 * pero generadas por código (sin coste de tokens) — el LLM puede regenerarlas
 * si en el futuro queremos sugerencias contextuales más finas.
 *
 * Reglas:
 *  - 2-3 chips por turno como máximo. Más es ruido cognitivo.
 *  - Cada chip sugiere un MOVIMIENTO conversacional concreto, no relleno.
 *  - El primer chip prioriza siempre cerrar acciones pendientes ("✓ Ya lo hice")
 *    si las hay — encaja con el patrón pedagógico del producto.
 *  - Después del cierre vienen 1-2 chips por dominantPattern.
 */

import type { DominantPattern } from "@/types/emotional-profile";

export type SuggestedAction = {
  id: string;
  label: string;
  /** Texto que se inyecta en el input cuando el usuario toca el chip. */
  prompt: string;
  /** "send" → enviar el prompt como mensaje. "complete" → cerrar acción pendiente. */
  kind: "send" | "complete";
};

const PATTERN_CHIPS: Record<DominantPattern, SuggestedAction[]> = {
  evita_decidir: [
    {
      id: "decide-options",
      label: "Pon las opciones sobre la mesa",
      prompt: "Ayúdame a poner sobre la mesa las opciones que tengo.",
      kind: "send",
    },
    {
      id: "decide-fear",
      label: "¿Y si elijo mal?",
      prompt: "¿Qué pasa si elijo mal?",
      kind: "send",
    },
  ],
  perfeccionismo: [
    {
      id: "perfect-enough",
      label: "¿Qué es \"lo suficiente\"?",
      prompt: "¿Qué sería lo suficientemente bueno aquí?",
      kind: "send",
    },
    {
      id: "perfect-min",
      label: "Dame el mínimo viable",
      prompt: "Dame el mínimo viable, no el ideal.",
      kind: "send",
    },
  ],
  comparación: [
    {
      id: "comp-self",
      label: "Volver a mi ritmo",
      prompt: "Quiero volver a mi ritmo, no al de otros.",
      kind: "send",
    },
    {
      id: "comp-why",
      label: "¿Por qué me comparo?",
      prompt: "¿Por qué crees que me comparo tanto?",
      kind: "send",
    },
  ],
  miedo_al_error: [
    {
      id: "err-reversible",
      label: "Una acción reversible",
      prompt: "Dame una acción reversible que pueda probar sin riesgo.",
      kind: "send",
    },
    {
      id: "err-worst",
      label: "¿Qué es lo peor que puede pasar?",
      prompt: "¿Qué es lo peor que puede pasar, concretamente?",
      kind: "send",
    },
  ],
  procrastinación: [
    {
      id: "procr-5min",
      label: "Algo de 5 minutos",
      prompt: "Dame algo concreto que pueda hacer en cinco minutos ahora.",
      kind: "send",
    },
    {
      id: "procr-one",
      label: "Acotamos a una sola cosa",
      prompt: "Acotamos esto a una sola cosa, ¿cuál?",
      kind: "send",
    },
  ],
};

const COMPLETE_ACTION_CHIP: SuggestedAction = {
  id: "action-done",
  label: "✓ Ya lo hice",
  prompt: "ya lo hice",
  kind: "complete",
};

const FALLBACK_CHIPS: SuggestedAction[] = [
  {
    id: "next-step",
    label: "¿Cuál es el siguiente paso?",
    prompt: "¿Cuál es el siguiente paso?",
    kind: "send",
  },
  {
    id: "explain-more",
    label: "Cuéntame más",
    prompt: "Cuéntame más sobre eso.",
    kind: "send",
  },
];

export function generateSuggestedActions(input: {
  dominantPattern: DominantPattern | null | undefined;
  hasPendingActions: boolean;
}): SuggestedAction[] {
  const chips: SuggestedAction[] = [];

  if (input.hasPendingActions) {
    chips.push(COMPLETE_ACTION_CHIP);
  }

  const patternChips = input.dominantPattern
    ? PATTERN_CHIPS[input.dominantPattern]
    : null;

  if (patternChips && patternChips.length > 0) {
    chips.push(...patternChips);
  } else {
    chips.push(...FALLBACK_CHIPS);
  }

  // Cap at 3 chips so the UI doesn't get noisy.
  return chips.slice(0, 3);
}
