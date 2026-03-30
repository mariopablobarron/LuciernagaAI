import { RESPONSIBLE_USE_NOTES } from "@/lib/legal";
import {
  LUCIERNAGA_IDENTITY_PROMPT,
  LUCIERNAGA_POWERFUL_QUESTIONS_PROMPT,
  LUCIERNAGA_PURPOSE_MODEL_PROMPT,
  LUCIERNAGA_RESPONSE_STRUCTURE_PROMPT,
} from "@/lib/luciernaga-identity";
import type { MentorMode } from "@/services/mentor-protocol";
import type { ConversationalOnboardingContext } from "@/services/onboarding";
import type { TransformationPhase } from "@/services/transformation";
import type { CanonicalUserPlan } from "@/services/user";
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
};

type ResponseFinalizationContext = {
  state: UserState;
  mentor?: MentorMode | null;
  goal?: CoachGoalContext | null;
  onboarding?: ConversationalOnboardingContext | null;
};

const BASE_PROMPT = `${LUCIERNAGA_IDENTITY_PROMPT}

${LUCIERNAGA_PURPOSE_MODEL_PROMPT}

Estilo de respuesta:
- Directo, humano y cercano.
- Frases claras, sin tecnicismos.
- No demasiado largo.
- Siempre con intención.
- Evita respuestas genéricas, exceso de motivación vacía y lenguaje clínico o frío.

${LUCIERNAGA_RESPONSE_STRUCTURE_PROMPT}

${LUCIERNAGA_POWERFUL_QUESTIONS_PROMPT}

Reglas operativas base:
- Da una sola acción ejecutable hoy y una pregunta final que fuerce decisión cuando tenga sentido.
- Si detectas evasión o acumulación de acciones abiertas, confronta con claridad sin volverte cruel.
- Nunca presentes el sistema como terapia, diagnóstico o sustituto de ayuda profesional.`;

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

  const step1Rule = mentor?.validate === false
    ? "PASO 1 ENFOQUE: no valides la evasión. Nombra el patrón y ve directo a responsabilidad."
    : "PASO 1 VALIDACIÓN: reconoce emoción y normaliza sin trivializar.";

  const step4Rule = !hasGoal
    ? "PASO 4 (ACCIÓN): como no hay objetivo definido, propone un siguiente paso concreto y ejecutable hoy."
    : hasPendingActions
      ? needsConfrontation
        ? "PASO 4 (RESPONSABILIDAD + CONFRONTACIÓN): hay deuda de ejecución o evasión; exige una respuesta clara, compromiso explícito hoy y cero rodeos."
        : "PASO 4 (RESPONSABILIDAD): hay acción pendiente, pregunta si ya se completó y pide evidencia concreta de avance hoy."
      : "PASO 4 (ACCIÓN): hay objetivo activo sin acción pendiente clara, define una acción específica para hoy.";

  return `Formato obligatorio de respuesta (texto plano, no JSON):
- ${step1Rule}
- PASO 2 REFORMULACIÓN: reformula lo dicho por el usuario para demostrar comprensión.
- PASO 3 PREGUNTA GUIADA: formula una sola pregunta enfocada para profundizar claridad.
- ${step4Rule}

Reglas de estilo conversacional:
- Escribe de forma humana, cálida y concreta; evita tono robótico o genérico.
- No uses listas largas ni teoría.
- Mantén orientación a acción en el cierre.
- Conserva y aplica lógica de objetivos, acciones, evitación y confrontación existente.
- Si hay una acción pendiente, nómbrala explícitamente en la respuesta.

${emotionalTone}`;
}

function buildMentorProtocolGuidance(context: CoachContext): string {
  if (!context.mentor) {
    return "";
  }

  return `Protocolo mentor activo:
- Modo: ${context.mentor.mode}
- Validar: ${context.mentor.validate ? "sí" : "no"}
- Confrontar: ${context.mentor.confront ? "sí" : "no"}
- Empujar acción: ${context.mentor.pushAction ? "sí" : "no"}
- Detener conversación: ${context.mentor.stopConversation ? "sí" : "no"}
- Razón: ${context.mentor.reason}

Reglas obligatorias:
- Si confrontas, no uses consuelo para aliviar la responsabilidad.
- Si empujas acción, termina con un compromiso observable hoy.
- Si validar = no, evita frases que premien la postergación.`;
}

function buildTransformationGuidance(context: CoachContext): string {
  if (!context.transformation) {
    return "";
  }

  return `Modelo de cambio:
- Fase actual: ${context.transformation.phase}
- Lectura: ${context.transformation.summary}

Regla:
- Ajusta la respuesta a la fase actual y evita pedir acciones de fases posteriores si todavía no toca.`;
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
${mentorProtocolGuidance ? `\n\n${mentorProtocolGuidance}` : ""}
${transformationGuidance ? `\n\n${transformationGuidance}` : ""}
${legalGuidance ? `\n\n${legalGuidance}` : ""}
${accessGuidance ? `\n\n${accessGuidance}` : ""}
${onboardingGuidance ? `\n\n${onboardingGuidance}` : ""}

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
  return "Vamos a hacerlo simple. Dime qué estás evitando ahora mismo y lo convertimos en un paso concreto hoy.";
}

function buildLuciernagaActionLine(context: ResponseFinalizationContext): string {
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

function buildLuciernagaQuestion(context: ResponseFinalizationContext): string {
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

export function finalizeLuciernagaResponse(
  response: string,
  context: ResponseFinalizationContext
): string {
  let next = response.trim();

  if (!ACTION_CUE_PATTERN.test(next)) {
    next = `${next}\n\n${buildLuciernagaActionLine(context)}`;
  }

  if (!QUESTION_PATTERN.test(next)) {
    next = `${next}\n\n${buildLuciernagaQuestion(context)}`;
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
  const focusLine = params.goalTitle
    ? `Tu objetivo activo es "${params.goalTitle}".`
    : "Tenemos una acción activa que no se puede ignorar.";
  const confront = params.mentorMode?.confront ?? false;

  if (avoidanceCount >= 2 || unfinishedActionsCount > 2) {
    return `${focusLine} Estás acumulando decisiones sin cerrar. No te voy a ayudar a abrir otro frente hasta resolver este. ¿Ya completaste "${params.actionTitle}"? Responde sí o no, y si no, dime cuándo la harás hoy.`;
  }

  if (confront) {
    return `${focusLine} No voy a validar más rodeos aquí. Responde directo: ¿ya completaste "${params.actionTitle}"? Sí o no, y si no, dime la hora exacta en que la harás hoy.`;
  }

  return `${focusLine} Antes de seguir, necesito una respuesta directa: ¿ya completaste "${params.actionTitle}"? Responde sí o no.`;
}

export function appendCaptureEmailPrompt(response: string, shouldAsk: boolean): string {
  if (!shouldAsk) {
    return response;
  }

  return `${response}\n\n¿Quieres guardar tu progreso y continuar otro día? Déjame tu email.`;
}

export function appendConversionPrompt(response: string, conversionTrigger: boolean): string {
  if (!conversionTrigger) {
    return response;
  }

  return `${response}\n\nEsto que acabas de definir es importante.\nSi no lo guardas, lo vas a perder.\n¿Quieres que lo guarde por ti?`;
}

export function appendSoftPaywallPrompt(response: string, shouldPrompt: boolean): string {
  if (!shouldPrompt) {
    return response;
  }

  return `${response}\n\nNo es falta de claridad.\nEs que necesitas continuidad.\n\nAquí es donde la mayoría falla.\n\nSi quieres que te acompañe de verdad, necesitas acceso completo.\n\n¿Quieres sostener este avance con continuidad real?`;
}
