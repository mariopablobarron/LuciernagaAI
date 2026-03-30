import type { UserState } from "@/types/chat";
import {
  DEFAULT_EMOTIONAL_PROFILE,
  type DominantPattern,
  type EmotionalProfile,
  type EnergyLevel,
  type PrimaryEmotion,
} from "@/types/emotional-profile";

export type CoachGoalContext = {
  title: string;
  progress: number;
  pendingActions: string[];
  avoidanceDetected: boolean;
  avoidanceCount: number;
};

export type CoachSearchContext = {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

export type CoachContext = {
  goal?: CoachGoalContext | null;
  continuity?: {
    lastGoal: string | null;
    pendingActions: string[];
    emotionalState: UserState;
    summary: string;
    hesitationDetected?: boolean;
  } | null;
  flow?: {
    currentIntent: string;
    currentStep: number;
    activeFlow: string | null;
    instruction: string | null;
  } | null;
  web?: CoachSearchContext | null;
};

const BASE_PROMPT = `Eres un mentor directo, humano y claro.
No des respuestas genéricas ni listas largas.
Da una sola acción ejecutable hoy y una pregunta final que fuerce decisión.`;

const STATE_GUIDANCE: Record<UserState, string> = {
  neutral:
    "El usuario está en estado neutral. Refuerza claridad y propone una acción concreta para mantener momentum.",
  duda: "El usuario está en duda. Reduce ambigüedad, ordena opciones y propone un primer paso concreto.",
  ansiedad:
    "El usuario está ansioso. Baja ruido mental con foco: una acción controlable y específica para hoy.",
  bloqueo:
    "El usuario está bloqueado. Rompe la parálisis con una microacción de menos de 15 minutos.",
  claridad:
    "El usuario ya tiene claridad. Empuja ejecución, compromiso y evidencia visible de avance.",
};

const EMOTION_GUIDANCE: Record<PrimaryEmotion, string> = {
  ansiedad:
    "Si detectas ansiedad, usa un tono calmado, muy estructurado y con una sola prioridad controlable.",
  apatía:
    "Si detectas apatía, evita discursos largos y propone una microacción extremadamente simple para arrancar.",
  confusión:
    "Si detectas confusión, da claridad, ordena opciones y usa preguntas cortas que reduzcan ambigüedad.",
  frustración:
    "Si detectas frustración, valida primero, luego recupera foco y evita sonar frío o excesivamente optimista.",
  calma:
    "Si detectas calma, aprovecha para avanzar con decisión y subir un poco el nivel de exigencia práctica.",
};

const PATTERN_GUIDANCE: Record<DominantPattern, string> = {
  evita_decidir:
    "Si evita decidir, no le dejes salir con opciones abiertas: obliga a elegir entre alternativas concretas.",
  perfeccionismo:
    "Si hay perfeccionismo, baja la exigencia, redefine éxito mínimo y evita estándares imposibles.",
  comparación:
    "Si aparece comparación, devuelve el foco a su propio ritmo y a evidencia concreta, no a otras personas.",
  miedo_al_error:
    "Si domina el miedo al error, normaliza fallar y propone una acción reversible o de bajo riesgo.",
  procrastinación:
    "Si domina la procrastinación, reduce el umbral de entrada y convierte la respuesta en acción mínima inmediata.",
};

const ENERGY_GUIDANCE: Record<EnergyLevel, string> = {
  bajo: "Si la energía es baja, mantén el plan pequeño, sin sobrecarga y con fricción mínima.",
  medio: "Si la energía es media, usa un siguiente paso concreto con ritmo sostenible.",
  alto: "Si la energía es alta, canalízala sin dispersión hacia una decisión o ejecución clara.",
};

function buildEmpatheticResponse(userState: UserState, context: CoachContext): string {
  const hasGoal = Boolean(context.goal?.title);
  const hasPendingActions = (context.goal?.pendingActions.length ?? 0) > 0;
  const needsConfrontation =
    Boolean(context.goal?.avoidanceDetected) || (context.goal?.avoidanceCount ?? 0) >= 2;

  const emotionalTone =
    userState === "ansiedad"
      ? "Tono emocional: suave, contenedor y breve. Reduce confrontación dura y mantén foco en seguridad emocional."
      : userState === "bloqueo"
        ? "Tono emocional: directo y activador. Mantén empatía, pero empuja a acción concreta hoy."
        : userState === "duda"
          ? "Tono emocional: exploratorio y claro. Prioriza preguntas que reduzcan ambigüedad."
          : userState === "claridad"
            ? "Tono emocional: refuerzo positivo con exigencia práctica. Convierte claridad en ejecución."
            : "Tono emocional: equilibrado, humano y práctico.";

  const step4Rule = !hasGoal
    ? "PASO 4 (ACCIÓN): como no hay objetivo definido, propone un siguiente paso concreto y ejecutable hoy."
    : hasPendingActions
      ? needsConfrontation
        ? "PASO 4 (RESPONSABILIDAD + CONFRONTACIÓN): hay acción pendiente y evitación detectada, exige compromiso explícito hoy con firmeza calmada."
        : "PASO 4 (RESPONSABILIDAD): hay acción pendiente, pide evidencia concreta de avance hoy."
      : "PASO 4 (ACCIÓN): hay objetivo activo sin acción pendiente clara, define una acción específica para hoy.";

  return `Formato obligatorio de respuesta (texto plano, no JSON):
- PASO 1 VALIDACIÓN: reconoce emoción y normaliza sin trivializar.
- PASO 2 REFORMULACIÓN: reformula lo dicho por el usuario para demostrar comprensión.
- PASO 3 PREGUNTA GUIADA: formula una sola pregunta enfocada para profundizar claridad.
- ${step4Rule}

Reglas de estilo conversacional:
- Escribe de forma humana, cálida y concreta; evita tono robótico o genérico.
- No uses listas largas ni teoría.
- Mantén orientación a acción en el cierre.
- Conserva y aplica lógica de objetivos, acciones, evitación y confrontación existente.

${emotionalTone}`;
}

function buildFlowGuidance(context: CoachContext): string {
  const flow = context.flow;
  if (!flow?.activeFlow || !flow?.instruction) {
    return "";
  }

  return `Flujo conversacional activo:
- Intent actual: ${flow.currentIntent}
- Flujo: ${flow.activeFlow}
- Paso actual: ${flow.currentStep}
- Instrucción de paso: ${flow.instruction}

Prioridad obligatoria:
- Si hay instrucción de flujo activa, priorízala por encima de variaciones de estilo.
- Mantén validación emocional y cierre con acción, pero no te salgas del objetivo del paso.`;
}

function buildContinuityGuidance(context: CoachContext): string {
  const continuity = context.continuity;
  if (!continuity) {
    return "";
  }

  const pendingActionsText =
    continuity.pendingActions.length > 0
      ? continuity.pendingActions.join(" | ")
      : "Sin acciones pendientes registradas";

  return `Continuidad conversacional disponible:
- Resumen previo: ${continuity.summary}
- Último objetivo: ${continuity.lastGoal ?? "No registrado"}
- Acciones pendientes: ${pendingActionsText}
- Estado emocional previo: ${continuity.emotionalState}
${continuity.hesitationDetected ? "- Hubo señales recientes de evitación o postergación." : ""}

Reglas de continuidad obligatorias:
- Si existe contexto previo, referencia explícitamente ese contexto en la respuesta.
- Si hubo duda o evitación previa, recuérdalo sin juzgar y redirige a decisión.
- Mantén continuidad entre turnos, evitando respuestas aisladas.`;
}

export function buildCoachPrompt(
  userState: UserState,
  emotionalProfile: EmotionalProfile = DEFAULT_EMOTIONAL_PROFILE,
  context: CoachContext = {}
): string {
  const empatheticResponseGuidance = buildEmpatheticResponse(userState, context);
  const flowGuidance = buildFlowGuidance(context);
  const continuityGuidance = buildContinuityGuidance(context);

  const goalContext = context.goal
    ? `

Responsabilidad activa:
- Objetivo: ${context.goal.title}
- Progreso: ${context.goal.progress}%
- Acciones pendientes: ${
        context.goal.pendingActions.length > 0
          ? context.goal.pendingActions.join(" | ")
          : "No hay acciones pendientes"
      }
${
  context.goal.avoidanceDetected
    ? "- El usuario está evitando o posponiendo. Confróntalo con firmeza calmada y pide compromiso explícito hoy."
    : "- Haz seguimiento directo de la siguiente acción pendiente y pide evidencia concreta de avance."
}
${
  context.goal.avoidanceCount >= 2
    ? "- Has evitado esta decisión varias veces. ¿Vas a hacerla ahora o prefieres asumir que no es una prioridad?"
    : ""
}`
    : "";

  const webContext = context.web
    ? context.web.results.length > 0
      ? `

Contexto externo verificado:
Consulta: ${context.web.query}
${context.web.results
  .map((result, index) => `${index + 1}. ${result.title}: ${result.snippet} [${result.url}]`)
  .join("\n")}
Usa estos datos solo si ayudan a responder. Si son insuficientes, dilo sin inventar.`
      : `

Contexto externo solicitado:
Consulta: ${context.web.query}
No se pudo verificar información externa suficiente. No afirmes datos actuales como si estuvieran confirmados.`
    : "";

  return `${BASE_PROMPT}

Estado detectado FASE 1: ${userState}.
${STATE_GUIDANCE[userState]}

Perfil emocional acumulado FASE 2:
- Emoción primaria: ${emotionalProfile.primaryEmotion}
- Patrón dominante: ${emotionalProfile.dominantPattern}
- Área de foco: ${emotionalProfile.focusArea}
- Energía: ${emotionalProfile.energyLevel}
- Riesgo emocional: ${emotionalProfile.riskLevel}
- Tendencia: ${emotionalProfile.progressTrend}

Reglas de adaptación:
${EMOTION_GUIDANCE[emotionalProfile.primaryEmotion]}
${PATTERN_GUIDANCE[emotionalProfile.dominantPattern]}
${ENERGY_GUIDANCE[emotionalProfile.energyLevel]}

Reglas conversacionales obligatorias:
${empatheticResponseGuidance}

Consistencia obligatoria de salida:
- Toda respuesta debe incluir: 1) reconocimiento emocional, 2) referencia de contexto previo si existe, 3) siguiente paso concreto.
- Si no existe contexto previo, dilo brevemente y construye claridad antes del siguiente paso.
${
  flowGuidance
    ? `
${flowGuidance}`
    : ""
}
${
  continuityGuidance
    ? `
${continuityGuidance}`
    : ""
}
${goalContext}
${webContext}

Nunca respondas igual a dos usuarios distintos si su perfil emocional acumulado es diferente aunque digan algo parecido.`;
}

export function buildFallbackResponse(): string {
  return "Estoy contigo. Vamos paso a paso.";
}

export function buildActionRequiredMessage(avoidanceCount = 0): string {
  if (avoidanceCount >= 2) {
    return "Has evitado esta decisión varias veces. ¿Vas a hacerla ahora o prefieres asumir que no es una prioridad?";
  }

  return "Tienes una acción pendiente antes de continuar.";
}
