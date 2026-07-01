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
 *
 * i18n: label y prompt se resuelven por locale. ES es la fuente. EN revisado.
 * PT/FR/DE traducidos pero PENDIENTE de revisión nativa (convención pt-PT: tu +
 * ênclise, como en coach.ts). NO exponer DE en el selector hasta validar.
 */

import type { DominantPattern } from "@/types/emotional-profile";

// Mismos locales que CoachContext["locale"] / i18n routing. Se define local
// para no acoplar este módulo a coach.ts (import de tipo sería erasable, pero
// mantenerlo independiente es más limpio).
type ChipLocale = "es" | "en" | "pt" | "fr" | "de";

export type SuggestedAction = {
  id: string;
  label: string;
  /** Texto que se inyecta en el input cuando el usuario toca el chip. */
  prompt: string;
  /** "send" → enviar el prompt como mensaje. "complete" → cerrar acción pendiente. */
  kind: "send" | "complete";
};

/** Texto localizado. ES siempre presente (fallback). */
type Localized = Record<ChipLocale, string>;

type ChipDef = {
  id: string;
  label: Localized;
  prompt: Localized;
  kind: "send" | "complete";
};

function resolveChip(def: ChipDef, locale: ChipLocale): SuggestedAction {
  return {
    id: def.id,
    label: def.label[locale] ?? def.label.es,
    prompt: def.prompt[locale] ?? def.prompt.es,
    kind: def.kind,
  };
}

const PATTERN_CHIPS: Record<DominantPattern, ChipDef[]> = {
  evita_decidir: [
    {
      id: "decide-options",
      label: {
        es: "Pon las opciones sobre la mesa",
        en: "Lay out the options",
        pt: "Põe as opções em cima da mesa",
        fr: "Pose les options sur la table",
        de: "Leg die Optionen auf den Tisch",
      },
      prompt: {
        es: "Ayúdame a poner sobre la mesa las opciones que tengo.",
        en: "Help me lay out the options I have.",
        pt: "Ajuda-me a pôr em cima da mesa as opções que tenho.",
        fr: "Aide-moi à poser les options que j'ai sur la table.",
        de: "Hilf mir, die Optionen, die ich habe, auf den Tisch zu legen.",
      },
      kind: "send",
    },
    {
      id: "decide-fear",
      label: {
        es: "¿Y si elijo mal?",
        en: "What if I choose wrong?",
        pt: "E se eu escolher mal?",
        fr: "Et si je choisis mal ?",
        de: "Und wenn ich falsch wähle?",
      },
      prompt: {
        es: "¿Qué pasa si elijo mal?",
        en: "What happens if I choose wrong?",
        pt: "O que acontece se eu escolher mal?",
        fr: "Que se passe-t-il si je choisis mal ?",
        de: "Was passiert, wenn ich falsch wähle?",
      },
      kind: "send",
    },
  ],
  perfeccionismo: [
    {
      id: "perfect-enough",
      label: {
        es: '¿Qué es "lo suficiente"?',
        en: 'What is "good enough"?',
        pt: 'O que é "suficiente"?',
        fr: 'C\'est quoi "assez bien" ?',
        de: 'Was ist "gut genug"?',
      },
      prompt: {
        es: "¿Qué sería lo suficientemente bueno aquí?",
        en: "What would be good enough here?",
        pt: "O que seria suficientemente bom aqui?",
        fr: "Qu'est-ce qui serait assez bien ici ?",
        de: "Was wäre hier gut genug?",
      },
      kind: "send",
    },
    {
      id: "perfect-min",
      label: {
        es: "Dame el mínimo viable",
        en: "Give me the minimum viable",
        pt: "Dá-me o mínimo viável",
        fr: "Donne-moi le minimum viable",
        de: "Gib mir das Minimum",
      },
      prompt: {
        es: "Dame el mínimo viable, no el ideal.",
        en: "Give me the minimum viable, not the ideal.",
        pt: "Dá-me o mínimo viável, não o ideal.",
        fr: "Donne-moi le minimum viable, pas l'idéal.",
        de: "Gib mir das Machbare, nicht das Ideal.",
      },
      kind: "send",
    },
  ],
  comparación: [
    {
      id: "comp-self",
      label: {
        es: "Volver a mi ritmo",
        en: "Back to my own pace",
        pt: "Voltar ao meu ritmo",
        fr: "Revenir à mon rythme",
        de: "Zurück zu meinem Tempo",
      },
      prompt: {
        es: "Quiero volver a mi ritmo, no al de otros.",
        en: "I want to get back to my own pace, not other people's.",
        pt: "Quero voltar ao meu ritmo, não ao dos outros.",
        fr: "Je veux revenir à mon rythme, pas à celui des autres.",
        de: "Ich will zu meinem eigenen Tempo zurück, nicht zu dem der anderen.",
      },
      kind: "send",
    },
    {
      id: "comp-why",
      label: {
        es: "¿Por qué me comparo?",
        en: "Why do I compare myself?",
        pt: "Porque me comparo?",
        fr: "Pourquoi je me compare ?",
        de: "Warum vergleiche ich mich?",
      },
      prompt: {
        es: "¿Por qué crees que me comparo tanto?",
        en: "Why do you think I compare myself so much?",
        pt: "Porque achas que me comparo tanto?",
        fr: "Pourquoi penses-tu que je me compare autant ?",
        de: "Warum glaubst du, dass ich mich so oft vergleiche?",
      },
      kind: "send",
    },
  ],
  miedo_al_error: [
    {
      id: "err-reversible",
      label: {
        es: "Una acción reversible",
        en: "A reversible action",
        pt: "Uma ação reversível",
        fr: "Une action réversible",
        de: "Ein umkehrbarer Schritt",
      },
      prompt: {
        es: "Dame una acción reversible que pueda probar sin riesgo.",
        en: "Give me a reversible action I can try without risk.",
        pt: "Dá-me uma ação reversível que possa experimentar sem risco.",
        fr: "Donne-moi une action réversible que je peux essayer sans risque.",
        de: "Gib mir einen umkehrbaren Schritt, den ich ohne Risiko ausprobieren kann.",
      },
      kind: "send",
    },
    {
      id: "err-worst",
      label: {
        es: "¿Qué es lo peor que puede pasar?",
        en: "What's the worst that could happen?",
        pt: "Qual é o pior que pode acontecer?",
        fr: "Quel est le pire qui puisse arriver ?",
        de: "Was ist das Schlimmste, das passieren kann?",
      },
      prompt: {
        es: "¿Qué es lo peor que puede pasar, concretamente?",
        en: "What's the worst that could happen, concretely?",
        pt: "Qual é o pior que pode acontecer, concretamente?",
        fr: "Quel est le pire qui puisse arriver, concrètement ?",
        de: "Was ist konkret das Schlimmste, das passieren kann?",
      },
      kind: "send",
    },
  ],
  procrastinación: [
    {
      id: "procr-5min",
      label: {
        es: "Algo de 5 minutos",
        en: "Something 5 minutes long",
        pt: "Algo de 5 minutos",
        fr: "Un truc de 5 minutes",
        de: "Etwas für 5 Minuten",
      },
      prompt: {
        es: "Dame algo concreto que pueda hacer en cinco minutos ahora.",
        en: "Give me something concrete I can do in five minutes right now.",
        pt: "Dá-me algo concreto que possa fazer em cinco minutos agora.",
        fr: "Donne-moi quelque chose de concret que je peux faire en cinq minutes maintenant.",
        de: "Gib mir etwas Konkretes, das ich jetzt in fünf Minuten tun kann.",
      },
      kind: "send",
    },
    {
      id: "procr-one",
      label: {
        es: "Acotamos a una sola cosa",
        en: "Narrow it to one thing",
        pt: "Reduzir a uma só coisa",
        fr: "Réduire à une seule chose",
        de: "Auf eine Sache eingrenzen",
      },
      prompt: {
        es: "Acotamos esto a una sola cosa, ¿cuál?",
        en: "Let's narrow this to one thing — which one?",
        pt: "Vamos reduzir isto a uma só coisa, qual?",
        fr: "Réduisons ça à une seule chose, laquelle ?",
        de: "Grenzen wir das auf eine Sache ein — welche?",
      },
      kind: "send",
    },
  ],
};

const COMPLETE_ACTION_CHIP: ChipDef = {
  id: "action-done",
  label: {
    es: "✓ Ya lo hice",
    en: "✓ I did it",
    pt: "✓ Já o fiz",
    fr: "✓ C'est fait",
    de: "✓ Erledigt",
  },
  prompt: {
    es: "ya lo hice",
    en: "I did it",
    pt: "já o fiz",
    fr: "c'est fait",
    de: "erledigt",
  },
  kind: "complete",
};

const FALLBACK_CHIPS: ChipDef[] = [
  {
    id: "next-step",
    label: {
      es: "¿Cuál es el siguiente paso?",
      en: "What's the next step?",
      pt: "Qual é o próximo passo?",
      fr: "Quelle est la prochaine étape ?",
      de: "Was ist der nächste Schritt?",
    },
    prompt: {
      es: "¿Cuál es el siguiente paso?",
      en: "What's the next step?",
      pt: "Qual é o próximo passo?",
      fr: "Quelle est la prochaine étape ?",
      de: "Was ist der nächste Schritt?",
    },
    kind: "send",
  },
  {
    id: "explain-more",
    label: {
      es: "Cuéntame más",
      en: "Tell me more",
      pt: "Conta-me mais",
      fr: "Dis-m'en plus",
      de: "Erzähl mir mehr",
    },
    prompt: {
      es: "Cuéntame más sobre eso.",
      en: "Tell me more about that.",
      pt: "Conta-me mais sobre isso.",
      fr: "Dis-m'en plus là-dessus.",
      de: "Erzähl mir mehr darüber.",
    },
    kind: "send",
  },
];

export function generateSuggestedActions(input: {
  dominantPattern: DominantPattern | null | undefined;
  hasPendingActions: boolean;
  /** Idioma de la UI/coach. Si falta → "es" (comportamiento histórico). */
  locale?: ChipLocale | null;
}): SuggestedAction[] {
  const locale: ChipLocale = input.locale ?? "es";
  const defs: ChipDef[] = [];

  if (input.hasPendingActions) {
    defs.push(COMPLETE_ACTION_CHIP);
  }

  const patternChips = input.dominantPattern
    ? PATTERN_CHIPS[input.dominantPattern]
    : null;

  if (patternChips && patternChips.length > 0) {
    defs.push(...patternChips);
  } else {
    defs.push(...FALLBACK_CHIPS);
  }

  // Cap at 3 chips so the UI doesn't get noisy.
  return defs.slice(0, 3).map((def) => resolveChip(def, locale));
}
