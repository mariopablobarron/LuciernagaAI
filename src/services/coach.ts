import { RESPONSIBLE_USE_NOTES } from "@/lib/legal";
import {
  MENTOR_IDENTITY_PROMPT,
  MENTOR_POWERFUL_QUESTIONS_PROMPT,
  MENTOR_PURPOSE_MODEL_PROMPT,
  MENTOR_RESPONSE_STRUCTURE_PROMPT,
} from "@/lib/mentor-identity";
import type { MentorMode } from "@/services/mentor-protocol";
import type { ConversationalOnboardingContext } from "@/services/onboarding";
import type { TransformationPhase } from "@/services/transformation";
import type { CanonicalUserPlan } from "@/services/user";
import type { UserState } from "@/domain/types";
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
  activeAction: string | null;
  avoidanceDetected: boolean;
  avoidanceCount: number;
  unfinishedActionsCount: number;
  confrontationMode: boolean;
};

export type CoachSearchContext = {
  query: string;
  usage: "practical_decision";
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

export type CoachContext = {
  goal?: CoachGoalContext | null;
  mentor?: MentorMode | null;
  transformation?: {
    phase: TransformationPhase;
    summary: string;
  } | null;
  legal?: {
    limitsNote?: string | null;
    critical?: boolean;
  } | null;
  continuity?: {
    lastGoal: string | null;
    pendingActions: string[];
    emotionalState: UserState;
    summary: string;
    hesitationDetected?: boolean;
    trend?: "mejor" | "igual" | "peor" | string;
  } | null;
  flow?: {
    currentIntent: string;
    currentStep: number;
    activeFlow: string | null;
    instruction: string | null;
  } | null;
  web?: CoachSearchContext | null;
  access?: {
    userPlan: CanonicalUserPlan;
    remainingMessages: number | null;
    hasActiveGoal: boolean;
    conversionTrigger?: boolean;
  } | null;
  onboarding?: ConversationalOnboardingContext | null;
  journeyPrompt?: string | null;
  projectPrompt?: string | null;
};

type ResponseFinalizationContext = {
  state: UserState;
  mentor?: MentorMode | null;
  goal?: CoachGoalContext | null;
  onboarding?: ConversationalOnboardingContext | null;
};

const BASE_PROMPT = `${MENTOR_IDENTITY_PROMPT}
${MENTOR_PURPOSE_MODEL_PROMPT}

Estilo: directo, humano, breve (4-6 frases max). Sin tecnicismos, sin motivación vacía. No eres terapia.

Si el usuario pregunta si esto es terapia o si puedes hacer terapia: responde con claridad que NO lo eres. Eres una guía práctica para ordenar pensamiento y mover a la acción. Si necesita terapia de verdad, sugiérele buscar un profesional en psicología — tu valor es complementario, no sustitutivo. No disfraces esta diferencia.
${MENTOR_RESPONSE_STRUCTURE_PROMPT}
${MENTOR_POWERFUL_QUESTIONS_PROMPT}`;

const STATE_GUIDANCE: Record<UserState, string> = {
  neutral: "Estado neutral. Refuerza claridad, propone acción concreta.",
  duda: "En duda. Reduce ambigüedad, ordena opciones, propone primer paso.",
  ansiedad: "Ansioso. Baja ruido: una sola acción controlable hoy.",
  bloqueo: "Bloqueado. Microacción <15 min para romper parálisis.",
  claridad: "Claridad. Empuja ejecución y evidencia visible.",
};

const EMOTION_GUIDANCE: Record<PrimaryEmotion, string> = {
  ansiedad: "Tono calmado, estructurado, una sola prioridad.",
  apatía: "Nada de discursos. Microacción simple para arrancar.",
  confusión: "Da claridad, ordena opciones, preguntas cortas.",
  frustración: "Valida primero, luego refoca. No seas frío ni optimista.",
  calma: "Aprovecha para avanzar con más exigencia.",
};

const PATTERN_GUIDANCE: Record<DominantPattern, string> = {
  evita_decidir: "Obliga a elegir entre alternativas concretas.",
  perfeccionismo: "Baja exigencia, redefine éxito mínimo.",
  comparación: "Devuelve foco a su ritmo, no a otros.",
  miedo_al_error: "Normaliza fallar, acción reversible.",
  procrastinación: "Reduce umbral de entrada, acción mínima inmediata.",
};

const ENERGY_GUIDANCE: Record<EnergyLevel, string> = {
  bajo: "Plan pequeño, fricción mínima.",
  medio: "Siguiente paso concreto, ritmo sostenible.",
  alto: "Si la energía es alta, canalízala sin dispersión hacia una decisión o ejecución clara.",
};

const ACTION_CUE_PATTERN =
  /\b(hoy|haz|elige|escribe|bloquea|envia|envía|manda|abre|cierra|agenda|camina|llama|define|ejecuta|actua|actúa|reserva|dedica|termina)\b/i;
const QUESTION_PATTERN = /[?¿]/;

function buildEmpatheticResponse(userState: UserState, context: CoachContext): string {
  const mentor = context.mentor;
  const hasGoal = Boolean(context.goal?.title);
  const hasPendingActions = (context.goal?.pendingActions.length ?? 0) > 0;
  const unfinishedActionsCount = context.goal?.unfinishedActionsCount ?? 0;
  const needsConfrontation =
    Boolean(context.continuity?.hesitationDetected) ||
    Boolean(context.goal?.confrontationMode) ||
    Boolean(context.goal?.avoidanceDetected) ||
    (context.goal?.avoidanceCount ?? 0) >= 2 ||
    unfinishedActionsCount > 2;

  const tone =
    userState === "ansiedad" ? "Tono suave, breve, una prioridad."
    : userState === "bloqueo" ? "Tono directo, empuja acción hoy."
    : userState === "duda" ? "Tono exploratorio, reduce ambigüedad."
    : userState === "claridad" ? "Refuerza, exige ejecución."
    : "Tono equilibrado.";

  const step1 = mentor?.validate === false
    ? "1. No valides evasión. Nombra el patrón."
    : "1. Reconoce emoción sin trivializar.";

  const step4 = !hasGoal
    ? "4. Propón acción concreta hoy."
    : needsConfrontation
      ? "4. Hay deuda/evasión: exige respuesta clara y compromiso hoy."
      : hasPendingActions
        ? "4. Pregunta si completó la acción pendiente. Pide evidencia."
        : "4. Define acción específica para hoy.";

  return `${tone}
${step1}
2. Porqué: qué hay detrás. Una frase que conecte emoción con lo que evita ver.
3. Pregunta que abre: una sola, que no se haya hecho.
${step4}
Sé humano, breve (4-6 frases), sin listas. Si hay acción pendiente, nómbrala. Local → global.

${tone}`;
}

function buildMentorProtocolGuidance(context: CoachContext): string {
  if (!context.mentor) {
    return "";
  }

  return `Mentor: ${context.mentor.mode}. Validar=${context.mentor.validate ? "sí" : "no"}, confrontar=${context.mentor.confront ? "sí" : "no"}, acción=${context.mentor.pushAction ? "sí" : "no"}. ${context.mentor.reason}`;
}

function buildTransformationGuidance(context: CoachContext): string {
  if (!context.transformation) {
    return "";
  }

  return `Fase: ${context.transformation.phase}. ${context.transformation.summary} Ajusta a esta fase.`;
}

function buildLegalGuidance(context: CoachContext): string {
  const limitsNote = context.legal?.limitsNote ?? RESPONSIBLE_USE_NOTES[0];

  return `Límites del sistema:
- ${limitsNote}
- ${RESPONSIBLE_USE_NOTES[1]}
- Nunca uses lenguaje que sugiera sustitución de terapia, diagnóstico o soporte de emergencia.`;
}

function buildAccessGuidance(context: CoachContext): string {
  const access = context.access;
  if (!access) {
    return "";
  }

  return `Contexto de continuidad y acceso:
- Plan actual: ${access.userPlan}
- Mensajes restantes hoy: ${
    access.remainingMessages === null ? "sin límite" : access.remainingMessages
  }
- Objetivo activo: ${access.hasActiveGoal ? "sí" : "no"}
${access.conversionTrigger ? "- Acaba de ocurrir un momento de valor real que merece continuidad." : ""}

Reglas obligatorias:
- Si mencionas continuidad o acceso, hazlo desde el valor que el usuario ya obtuvo, no como pitch frío.
- Si el plan es free y quedan pocos mensajes, subraya la importancia de sostener el proceso.
- Si hay objetivo activo, enfatiza continuidad, seguimiento y evidencia de avance.
- No uses lenguaje comercial agresivo ni manipulación artificial.`;
}

function buildOnboardingGuidance(context: CoachContext): string {
  const onboarding = context.onboarding;
  if (!onboarding?.active) {
    return "";
  }

  const stageGuidance =
    onboarding.stage === "opening"
      ? `- Si el usuario llega con saludo o vaguedad, evita una bienvenida larga y usa esta pregunta como entrada útil: "${onboarding.starterQuestion}".`
      : onboarding.stage === "reflection"
        ? "- Refleja el problema central en una sola frase y recorta el foco hasta dejar un único frente accionable."
        : "- Cierra con una primera acción concreta, ejecutable hoy y visible para el propio usuario.";

  return `Onboarding conversacional activo:
- Intent inicial detectado: ${onboarding.intent}
- Etapa: ${onboarding.stage}
- Resultado buscado: ${onboarding.targetOutcome}
- Pregunta de entrada: ${onboarding.starterQuestion}

Reglas obligatorias de onboarding:
${stageGuidance}
- Detecta el problema real detrás del mensaje inicial y nómbralo con claridad.
- Refleja la fricción del usuario antes de empujar la acción.
- En los primeros turnos, evita teoría o intros largas: lleva la conversación hacia una primera acción en menos de dos minutos.`;
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

  const trendLabel =
    continuity.trend === "mejor"
      ? "Tendencia positiva — el usuario lleva mejorando. Refuerza el avance, no sobreexpliques."
      : continuity.trend === "peor"
        ? "Tendencia negativa — el usuario lleva empeorando. Sé más directo y propón una acción mínima."
        : "";

  return `Continuidad conversacional disponible:
- Resumen previo: ${continuity.summary}
- Último objetivo: ${continuity.lastGoal ?? "No registrado"}
- Acciones pendientes: ${pendingActionsText}
- Estado emocional previo: ${continuity.emotionalState}
${trendLabel ? `- ${trendLabel}` : ""}
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
  const mentorProtocolGuidance = buildMentorProtocolGuidance(context);
  const transformationGuidance = buildTransformationGuidance(context);
  const flowGuidance = buildFlowGuidance(context);
  const continuityGuidance = buildContinuityGuidance(context);
  const legalGuidance = buildLegalGuidance(context);
  const accessGuidance = buildAccessGuidance(context);
  const onboardingGuidance = buildOnboardingGuidance(context);
  const journeyGuidance = context.journeyPrompt ?? "";
  const projectGuidance = context.projectPrompt ?? "";

  const goalContext = context.goal
    ? `

Responsabilidad activa:
- Objetivo: ${context.goal.title}
- Progreso: ${context.goal.progress}%
- Acción prioritaria: ${context.goal.activeAction ?? "Definir la siguiente acción ahora"}
- Acciones no completadas: ${context.goal.unfinishedActionsCount}
- Acciones pendientes: ${
        context.goal.pendingActions.length > 0
          ? context.goal.pendingActions.join(" | ")
          : "No hay acciones pendientes"
      }
${
  context.goal.confrontationMode
    ? "- Activa modo confrontación: ve directo al punto, nombra la evasión o la deuda de ejecución y exige una respuesta binaria o una hora concreta."
    : "- Haz seguimiento directo de la siguiente acción pendiente y pide evidencia concreta de avance."
}
${
  context.goal.avoidanceCount >= 2
    ? "- Has evitado esta decisión varias veces. ¿Vas a hacerla ahora o prefieres asumir que no es una prioridad?"
    : ""
}
${
  context.goal.unfinishedActionsCount > 2
    ? "- Hay demasiadas acciones abiertas. No abras otro frente: reduce todo a una sola acción prioritaria y exige cierre."
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

  // Build compact context — only include non-empty sections
  const sections = [
    BASE_PROMPT,
    `Estado: ${userState}. ${STATE_GUIDANCE[userState]}`,
    `Perfil: emoción=${emotionalProfile.primaryEmotion}, patrón=${emotionalProfile.dominantPattern}, energía=${emotionalProfile.energyLevel}, riesgo=${emotionalProfile.riskLevel}, tendencia=${emotionalProfile.progressTrend}.`,
    `Adaptación: ${EMOTION_GUIDANCE[emotionalProfile.primaryEmotion]} ${PATTERN_GUIDANCE[emotionalProfile.dominantPattern]} ${ENERGY_GUIDANCE[emotionalProfile.energyLevel]}`,
    empatheticResponseGuidance,
    mentorProtocolGuidance,
    transformationGuidance,
    legalGuidance,
    accessGuidance,
    onboardingGuidance,
    journeyGuidance,
    projectGuidance,
  ].filter(Boolean);

  return `${sections.join("\n\n")}
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

export function buildFallbackResponse(state?: UserState): string {
  switch (state) {
    case "bloqueo":
      return "Parece que algo se ha trabado. Dime una cosa: ¿qué es lo que llevas posponiendo y por qué?";
    case "ansiedad":
      return "Respira. Una cosa a la vez. ¿Qué es lo que más te presiona ahora mismo?";
    case "duda":
      return "Entiendo la incertidumbre. Vamos a ordenar: ¿cuáles son las dos opciones que ves?";
    case "claridad":
      return "Tienes claridad — aprovechemos. ¿Cuál es el paso más concreto que puedes dar hoy?";
    default:
      return "Vamos a hacerlo simple. Dime qué estás evitando ahora mismo y lo convertimos en un paso concreto hoy.";
  }
}

function buildActionLine(context: ResponseFinalizationContext): string {
  const activeAction = context.goal?.activeAction;
  const unfinishedActionsCount = context.goal?.unfinishedActionsCount ?? 0;
  const confront = context.mentor?.confront ?? false;

  if (activeAction && (confront || unfinishedActionsCount > 0)) {
    return confront
      ? `No necesitas seguir dándole vueltas. Tu foco ahora es este: ${activeAction}.`
      : `Tu siguiente paso concreto es este: ${activeAction}.`;
  }

  if (context.state === "bloqueo") {
    return "Haz una versión mínima de esto en menos de 10 minutos.";
  }

  if (context.state === "duda") {
    return "Reduce esto a dos opciones y elige una hoy.";
  }

  if (context.state === "ansiedad") {
    return "Elige una sola tarea controlable y ciérrala hoy.";
  }

  if (context.state === "claridad") {
    return "Convierte esta claridad en una evidencia visible hoy.";
  }

  if (context.onboarding?.active) {
    return "No busques entenderlo todo ahora: elige un paso pequeño que puedas hacer hoy.";
  }

  return "Convierte esto en un paso concreto antes de cerrar el día.";
}

function buildQuestion(context: ResponseFinalizationContext): string {
  const activeAction = context.goal?.activeAction;
  const confront = context.mentor?.confront ?? false;

  if (activeAction && confront) {
    return `¿Lo haces hoy o sigues evitando lo importante?`;
  }

  if (activeAction) {
    return "¿Lo vas a hacer hoy?";
  }

  if (context.state === "bloqueo") {
    return "¿Cuál es el paso más pequeño que sí puedes hacer hoy?";
  }

  if (context.state === "duda") {
    return "¿Qué opción eliges hoy?";
  }

  if (context.state === "ansiedad") {
    return "¿Qué puedes controlar en la próxima hora?";
  }

  if (context.state === "claridad") {
    return "¿Qué vas a cerrar hoy para que esto deje de ser solo una idea?";
  }

  if (context.onboarding?.active) {
    return "¿Qué estás evitando ahora mismo?";
  }

  return "¿Qué pequeño paso puedes dar hoy?";
}

export function finalizeResponse(
  response: string,
  context: ResponseFinalizationContext
): string {
  let next = response.trim();

  if (!ACTION_CUE_PATTERN.test(next)) {
    next = `${next}\n\n${buildActionLine(context)}`;
  }

  if (!QUESTION_PATTERN.test(next)) {
    next = `${next}\n\n${buildQuestion(context)}`;
  }

  return next;
}

export function buildActionRequiredMessage(params: {
  actionTitle: string;
  goalTitle?: string | null;
  avoidanceCount?: number;
  unfinishedActionsCount?: number;
  mentorMode?: MentorMode | null;
}): string {
  const avoidanceCount = params.avoidanceCount ?? 0;
  const unfinishedActionsCount = params.unfinishedActionsCount ?? 0;
  const confront = params.mentorMode?.confront ?? false;
  const action = `«${params.actionTitle}»`;

  if (avoidanceCount >= 2 || unfinishedActionsCount > 2) {
    return `Oye, antes de abrir algo nuevo vuelvo a esto porque importa. Se están quedando varios cabos sueltos y no quiero acompañarte a otro frente con este aún en el aire. ¿Hiciste ${action} o todavía no? Si no, cuéntame a qué hora lo haces hoy.`;
  }

  if (confront) {
    return `Vamos sin rodeos, porque creo que le estamos dando vueltas: ¿ya hiciste ${action}? Si aún no, dime a qué hora lo cierras hoy.`;
  }

  return `Antes de seguir, cuéntame una cosa: ¿ya hiciste ${action}? Con un sí o un no me oriento y vemos por dónde seguimos.`;
}

export const CAPTURE_EMAIL_PROMPT =
  "Si quieres retomar esto otro día justo donde lo dejamos, déjame tu email y te lo guardo.";

export const PAYWALL_MESSAGE =
  "No es falta de claridad. Es que esto se sostiene cuando vuelves mañana, y al día siguiente. Si quieres que te acompañe con esa continuidad, te cuento cómo seguimos.\n\n¿Quieres sostener este avance con continuidad real?";

export function appendCaptureEmailPrompt(response: string, shouldAsk: boolean): string {
  if (!shouldAsk) {
    return response;
  }

  return `${response}\n\n${CAPTURE_EMAIL_PROMPT}`;
}

export function appendConversionPrompt(response: string, conversionTrigger: boolean): string {
  if (!conversionTrigger) {
    return response;
  }

  return `${response}\n\nEsto que acabas de definir es importante. Si quieres, lo guardo para que no se te escape entre el ruido del día. ¿Te lo guardo?`;
}

export function appendSoftPaywallPrompt(response: string, shouldPrompt: boolean): string {
  if (!shouldPrompt) {
    return response;
  }

  return `${response}\n\n${PAYWALL_MESSAGE}`;
}
