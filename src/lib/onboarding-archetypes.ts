// Mensajes de apertura del mentor según respuestas del onboarding.
// Cubren 6 arquetipos (combinación feeling x intent). El timeframe ajusta tono pero no el texto base.

export type OnboardingFeeling = "bloqueo" | "ansiedad" | "duda" | "cansancio" | "claridad" | "otra";
export type OnboardingIntent = "entender" | "decidir" | "soltar";

export type OnboardingPayload = {
  feeling: OnboardingFeeling;
  feelingCustom?: string | null;
  intent: OnboardingIntent;
};

function labelForFeeling(p: OnboardingPayload): string {
  if (p.feeling === "otra" && p.feelingCustom) return p.feelingCustom;
  return p.feeling;
}

export function buildOnboardingOpeningMessage(p: OnboardingPayload): string {
  const word = labelForFeeling(p);

  // Arquetipo F — claridad, cualquier intent
  if (p.feeling === "claridad") {
    return "Has entrado diciendo que estás con claridad. Eso es raro y vale la pena no estropearlo.\n\n¿Qué es lo que ves claro ahora que antes no veías? Cuéntamelo antes de que se te olvide.";
  }

  // Arquetipo especial — "otra cosa" con palabra libre
  if (p.feeling === "otra") {
    return `Has escrito "${word}". No voy a asumir qué significa para ti.\n\n¿Qué es lo primero que te viene cuando piensas en esa palabra hoy? Una imagen, una escena, una sensación — lo que aparezca.`;
  }

  // Arquetipo D — duda → entender
  if (p.feeling === "duda" && p.intent === "entender") {
    return "La duda no siempre es falta de información. A veces es que la respuesta no te gusta.\n\n¿Sobre qué dudas ahora mismo? No hace falta que esté ordenado.";
  }

  // Arquetipo E — duda → decidir
  if (p.feeling === "duda" && p.intent === "decidir") {
    return "Si estás dudando, la decisión ya está medio tomada — solo que todavía no te lo has permitido.\n\n¿Entre qué y qué dudas? Aunque parezca obvio escribirlo.";
  }

  // Duda → soltar (no previsto explícitamente, tratar como D suave)
  if (p.feeling === "duda") {
    return "La duda a veces pide espacio antes que respuestas.\n\n¿Qué duda te ronda hoy sin que sepas muy bien cómo nombrarla?";
  }

  // Bloqueo / Ansiedad / Cansancio
  if (p.intent === "entender") {
    // Arquetipo A
    return `Has dicho ${word}, y eso ya es más de lo que la mayoría se permite nombrar.\n\nTe dejo una pregunta para empezar, no para responder rápido:\n\n¿En qué momento concreto del día lo notas más? No me cuentes por qué. Solo cuándo.`;
  }
  if (p.intent === "decidir") {
    // Arquetipo B
    return `${word.charAt(0).toUpperCase() + word.slice(1)} y querer decidir al mismo tiempo es pedirle mucho a la cabeza. Normalmente hay que atender lo primero antes de que aparezca lo segundo.\n\nPara empezar por donde se puede:\n\n¿Qué decisión llevas más tiempo aplazando? Una frase basta.`;
  }
  // Arquetipo C — soltar
  return "Entonces no te voy a preguntar nada importante todavía.\n\nSi tuvieras que nombrar lo que te pesa hoy con una palabra — sin explicarla, sin justificarla — ¿cuál sería?";
}

// Bloque de contexto para inyectar en el system prompt del mentor en los primeros turnos.
export function buildOnboardingPromptBlock(p: OnboardingPayload): string {
  const feelingLabel = p.feeling === "otra" && p.feelingCustom ? `"${p.feelingCustom}" (otra)` : p.feeling;
  const intentLabel =
    p.intent === "entender" ? "entenderse mejor" : p.intent === "decidir" ? "decidir algo" : "soltar, sin buscar nada concreto";

  return `Contexto de onboarding del usuario (recién registrado):
- Estado con el que entra: ${feelingLabel}
- Lo que busca: ${intentLabel}

Úsalo como trasfondo para los primeros intercambios: no lo repitas literal, no lo cites como "has dicho que...". Deja que guíe el tono y la dirección de tus preguntas. A partir del 5º turno, puedes dejar de referenciarlo.`;
}
