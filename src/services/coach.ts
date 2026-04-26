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
  buildOnboardingPromptBlock,
  type OnboardingPayload,
} from "@/lib/onboarding-archetypes";
import {
  DEFAULT_EMOTIONAL_PROFILE,
  type DominantPattern,
  type EmotionalProfile,
  type EnergyLevel,
  type PrimaryEmotion,
} from "@/types/emotional-profile";
import { buildDomainGuidance } from "@/services/domain";

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
    // Memoria persistente entre conversaciones (últimos 7 días). Da continuidad
    // real al mentor cuando el usuario vuelve tras días.
    weeklyPattern?: {
      daysSinceLastSession: number | null;
      dominantStateLast7d: string | null;
      avoidanceCountLast7d: number;
      crisisEventsLast7d: number;
      conversationCountLast7d: number;
    } | null;
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
  welcomeOnboarding?: OnboardingPayload | null;
  journeyPrompt?: string | null;
  projectPrompt?: string | null;
  // Modo de acompañamiento elegido por el usuario (Acompáñame, Confróntame,
  // etc.). Se inyecta en el system prompt sin aparecer nunca en el chat
  // visible del usuario.
  accompanimentMode?: { label: string; instruction: string } | null;
  // Forma gramatical preferida para dirigirse al usuario.
  // - "feminine"  → conjuga en femenino ("estás cansada")
  // - "masculine" → conjuga en masculino ("estás cansado")
  // - "neutral" / null → evita conjugaciones de género ("estás teniendo un momento difícil")
  // Se carga desde UserPreferences.genderForm.
  userGender?: "feminine" | "masculine" | "neutral" | null;
  // Reformulación contextual del mensaje cuando el original era ambiguo
  // (referencias tipo "eso", "y por qué", etc.). Se inyecta en el system
  // prompt como pista para resolver pronombres referenciales sin pisar el
  // mensaje original que ve el usuario. Generada en phases/reformulate.ts.
  contextualInterpretation?: string | null;
  // Intents extendidos detectados en el mensaje del usuario. Modulan el TONO
  // del mentor sin interceptar el flow normal del chat. La detección de
  // crisis activa (ideación suicida real, autolesión) sigue viviendo en
  // risk.ts y se ejecuta antes que el LLM.
  extendedIntent?: {
    grief: boolean;
    mildIdeation: boolean;
    gratitudeClosure: boolean;
  } | null;
  // Resumen acumulado de mensajes antiguos que se salen de la ventana literal
  // (LangChain SummaryBufferMemory). Permite al mentor recordar nombres,
  // decisiones y arcos de turnos muy anteriores al actual.
  conversationSummary?: string | null;
  // Dominio causal detectado (relacional, work, health, financial, etc.).
  // Eje complementario al intent conversacional: el intent dice qué quiere
  // hacer el usuario en el chat, el dominio dice de qué área habla.
  // Generado en services/domain.ts. NO se menciona literalmente al usuario.
  problemDomain?: import("./domain").ProblemDomain;
  // Ecos semánticos de material destilado pasado (DailyLogs, resúmenes de
  // conversaciones cerradas) recuperados por similitud con el mensaje actual.
  // Permite al mentor detectar patrones longitudinales sin recitar la historia.
  // Generados en phases/context.ts → loadSemanticEchoes (PR2 de memoria
  // semántica). Solo se inyectan si hay hits por encima de un umbral de
  // similitud y la conversación no es anónima ni crisis.
  pastEchoes?: Array<{
    source: "daily_log" | "conversation_summary" | "insight";
    gist: string;
    daysAgo: number;
    similarity: number;
  }> | null;
  // Tipo del Eneagrama (1..9) si el usuario completó el test en /profile/eneagrama.
  // Modula el TONO y el tipo de pregunta del mentor — nunca se etiqueta al
  // usuario explícitamente con su tipo a menos que él lo mencione.
  enneagramType?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null;
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

REGLAS DE FORMATO (no negociables):
- NUNCA uses headers Markdown ni labels como **Reflejo:**, **Porqué:**, **Acción:**, **Pregunta:**, **Validación:**, **Microacción:** ni similares. Esa estructura es interna a tu razonamiento — al usuario llega como conversación natural, NO como lista etiquetada de coaching.
- UNA sola pregunta de cierre. NO dos. NO tres. Si tienes varias dudas, elige la más interpeladora y descarta el resto. La acción concreta NO cuenta como pregunta.
- Negrita escasa, solo para destacar UNA frase clave. No más.
- Párrafos cortos separados por línea en blanco. No bullets numerados.

EJEMPLO de qué NO hacer (jerga visible, dos preguntas):
"**Reflejo:** Llevas mucho encima — escuela, trabajo, hijos.
**Porqué:** Detrás del cansancio veo que mides el sufrimiento ajeno con tu vara.
**Pregunta:** ¿Qué necesitarías recibir para dejar esa cuenta?
**Acción:** La próxima vez que sientas frustración, pausa dos segundos. ¿Qué cambia para ti cuando tu historia no está en el centro?"

EJEMPLO correcto (mismo contenido, conversación natural, una sola pregunta final):
"Llevas mucho encima — escuela, trabajo, hijos. Y cuando alguien a tu lado se queja de algo que a ti te parece menor, la frustración tiene sentido.

Detrás de eso no es solo cansancio. Es que cuando nadie valida lo que cargas, empiezas a medir el sufrimiento ajeno con tu propio esfuerzo como vara — y eso convierte la amistad en una competencia que nadie ganó.

La próxima vez que sientas esa frustración, pausa dos segundos antes de reaccionar.

¿Qué necesitarías recibir tú para dejar de llevar esa cuenta?"
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

  const weekly = continuity.weeklyPattern;
  const weeklyBlock = weekly
    ? [
        weekly.daysSinceLastSession !== null && weekly.daysSinceLastSession >= 1
          ? `- Vuelve tras ${weekly.daysSinceLastSession} día(s). Reconócelo brevemente sin sermón.`
          : "",
        weekly.dominantStateLast7d
          ? `- Estado dominante últimos 7 días: ${weekly.dominantStateLast7d}.`
          : "",
        weekly.avoidanceCountLast7d >= 2
          ? `- Patrón: ${weekly.avoidanceCountLast7d} evitaciones en 7 días — confronta sin suavizar.`
          : "",
        weekly.crisisEventsLast7d > 0
          ? `- Hubo ${weekly.crisisEventsLast7d} evento(s) de riesgo esta semana — tono contenido.`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `Continuidad conversacional disponible:
- Resumen previo: ${continuity.summary}
- Último objetivo: ${continuity.lastGoal ?? "No registrado"}
- Acciones pendientes: ${pendingActionsText}
- Estado emocional previo: ${continuity.emotionalState}
${trendLabel ? `- ${trendLabel}` : ""}
${continuity.hesitationDetected ? "- Hubo señales recientes de evitación o postergación." : ""}
${weeklyBlock}

Reglas de continuidad obligatorias:
- Si existe contexto previo, referencia explícitamente ese contexto en la respuesta.
- Si hubo duda o evitación previa, recuérdalo sin juzgar y redirige a decisión.
- Mantén continuidad entre turnos, evitando respuestas aisladas.`;
}

function buildPastEchoesGuidance(context: CoachContext): string {
  const echoes = context.pastEchoes;
  if (!echoes || echoes.length === 0) return "";

  const lines = echoes.map((e) => {
    const when = e.daysAgo === 0
      ? "hoy mismo"
      : e.daysAgo === 1
        ? "ayer"
        : `hace ${e.daysAgo} día(s)`;
    const label = e.source === "daily_log"
      ? "registro de diario"
      : e.source === "conversation_summary"
        ? "conversación previa"
        : "reflexión";
    // Recortamos para no inflar el prompt.
    const gist = e.gist.length > 220 ? e.gist.slice(0, 217) + "…" : e.gist;
    return `- ${when} (${label}): ${gist}`;
  });

  return `Ecos pasados relacionados con lo que el usuario plantea ahora (recuperados por similitud, no por recencia):
${lines.join("\n")}

Reglas para usar estos ecos:
- NO los cites textualmente ni digas "el día tal escribiste...". El usuario no recuerda exactamente lo que puso y sentirse vigilado rompe la confianza.
- Úsalos solo si refuerzan UNA pregunta concreta sobre el patrón ("¿esto es la misma sensación que tuviste hace unos días o algo distinto?").
- Si el eco contradice lo que dice ahora, no lo confrontes — pregunta con curiosidad, no con prueba.
- Si no aportan a la respuesta de este turno, ignóralos. Mejor silencio que invasión.`;
}

function buildGenderGuidance(context: CoachContext): string {
  const g = context.userGender;
  if (g === "feminine") {
    return "Forma gramatical: la persona usuaria prefiere que te dirijas a ella en FEMENINO. Conjuga adjetivos y participios en femenino (\"estás cansada\", \"te has quedado bloqueada\", \"tú misma\").";
  }
  if (g === "masculine") {
    return "Forma gramatical: la persona usuaria prefiere que te dirijas a él en MASCULINO. Conjuga adjetivos y participios en masculino (\"estás cansado\", \"te has quedado bloqueado\", \"tú mismo\").";
  }
  // neutral o null
  return "Forma gramatical: NO conoces el género de la persona usuaria. EVITA conjugaciones de género en adjetivos y participios. Reformula con frases neutras: en vez de \"estás cansado/a\" usa \"estás en un momento de cansancio\"; en vez de \"te has quedado bloqueado/a\" usa \"te has quedado en bloqueo\"; en vez de \"tú mismo/a\" usa \"tú\". Si necesitas expresar un estado, prefiere sustantivos (cansancio, bloqueo, claridad) sobre adjetivos conjugados.";
}

/**
 * Guidance al mentor según el tipo del Eneagrama del usuario. NO se etiqueta
 * al usuario con su tipo en el chat (a menos que él lo mencione) — es una
 * pista interna para ajustar tono y preguntas.
 */
const ENNEAGRAM_GUIDANCE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, string> = {
  1: 'Tipo 1 (perfeccionista). Evita el tono normativo o "deberías" — ya se exige bastante. Valida explícitamente que está bien dejar algo imperfecto antes de proponer acción.',
  2: "Tipo 2 (ayudador). Devuelve siempre la atención hacia él/ella: tiende a hablar de los demás. Pregunta por sus propias necesidades sin asumir que ya las conoce.",
  3: 'Tipo 3 (triunfador). Evita reforzar la lógica de "más logros". Bajo las metas suele haber miedo a la imagen — invita explícitamente a la pausa o a mostrar algo no resuelto.',
  4: 'Tipo 4 (individualista). Reconoce la profundidad de su experiencia sin reflejarla solo como problema. Evita arreglar la melancolía; pregunta qué le dice esa emoción, no cómo eliminarla.',
  5: "Tipo 5 (investigador). Da espacio. Evita preguntas que pidan emoción inmediata; entra primero por análisis o información, y deja que la emoción aparezca cuando se sienta seguro/a.",
  6: "Tipo 6 (leal/escéptico). Da certezas explícitas en tu razonamiento — necesita ver el porqué. Reconoce sus dudas como inteligencia, no como bloqueo. Evita decisiones improvisadas.",
  7: "Tipo 7 (entusiasta). Tiende a saltar a la siguiente cosa para evitar el malestar. Sostén el tema actual con suavidad antes de explorar nuevas posibilidades.",
  8: "Tipo 8 (desafiador). Habla directo, sin rodeos ni cuidados excesivos — los lee como condescendencia. Pero invita explícitamente a la vulnerabilidad cuando aparezca cansancio.",
  9: 'Tipo 9 (pacificador). Suele diluir lo suyo bajo lo que prefieren los demás. Pregunta directamente "¿qué quieres TÚ?" y resiste si responde con "lo que sea". Sin presión, pero sin diluirte tú también.',
};

function buildEnneagramGuidance(context: CoachContext): string {
  const t = context.enneagramType;
  if (!t) return "";
  return `Perfil del usuario (Eneagrama, no mencionar la etiqueta al usuario): ${ENNEAGRAM_GUIDANCE[t]}`;
}

function buildExtendedIntentGuidance(context: CoachContext): string {
  const i = context.extendedIntent;
  if (!i || (!i.grief && !i.mildIdeation && !i.gratitudeClosure)) return "";

  const lines: string[] = ["Señales adicionales detectadas en el último mensaje del usuario:"];

  if (i.grief) {
    lines.push(
      `- DUELO/PÉRDIDA detectado. Antes de proponer cualquier acción, RECONOCE la pérdida en concreto (sin generalismos como "lo siento mucho"). El duelo no se ordena ni se resuelve con tareas. Pregunta sólo si necesita hablar de esa pérdida hoy o si prefiere mover el foco a otra cosa. NO empujes acción en este turno aunque haya objetivo abierto.`,
    );
  }

  if (i.mildIdeation) {
    lines.push(
      `- IDEACIÓN LEVE / MALESTAR PROFUNDO no clínico. NO actives protocolo de crisis (eso ya lo hace el sistema cuando aplica). Pero ajusta el tono: pisa suave, valida el peso de lo que está sintiendo sin dramatizar ni minimizar, no propongas acción inmediata. Pregunta UNA cosa concreta sobre cómo está ahora mismo (no sobre el futuro). Si la persona desliza señales más fuertes en su respuesta, prioriza seguridad sobre coaching.`,
    );
  }

  if (i.gratitudeClosure) {
    lines.push(
      `- GRATITUD / CIERRE POSITIVO. La persona quiere terminar la sesión bien. NO interpretes como problema ni busques nuevas aristas. Acepta el cierre con calidez breve (sin empalagar), reconoce un detalle concreto de lo trabajado hoy, y deja una sola línea de continuidad para la próxima vez ("la próxima vez que vuelvas, retomamos X si quieres"). NO propongas más acciones en este turno.`,
    );
  }

  return lines.join("\n");
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
  const pastEchoesGuidance = buildPastEchoesGuidance(context);
  const legalGuidance = buildLegalGuidance(context);
  const accessGuidance = buildAccessGuidance(context);
  const onboardingGuidance = buildOnboardingGuidance(context);
  const genderGuidance = buildGenderGuidance(context);
  const extendedIntentGuidance = buildExtendedIntentGuidance(context);
  const enneagramGuidance = buildEnneagramGuidance(context);
  const conversationSummaryGuidance = context.conversationSummary
    ? `Resumen de la conversación hasta ahora (turnos anteriores a los visibles abajo, úsalo para recordar nombres, decisiones y arcos): ${context.conversationSummary}`
    : "";
  const welcomeOnboardingGuidance = context.welcomeOnboarding
    ? buildOnboardingPromptBlock(context.welcomeOnboarding)
    : "";
  const journeyGuidance = context.journeyPrompt ?? "";
  const projectGuidance = context.projectPrompt ?? "";
  const accompanimentGuidance = context.accompanimentMode
    ? `Modo de acompañamiento elegido por el usuario: "${context.accompanimentMode.label}". ${context.accompanimentMode.instruction}`
    : "";

  // Pista contextual cuando el mensaje original era ambiguo (referencias
  // pronominales, "y por qué?", "lo que dije antes"). NO sustituye al
  // mensaje del usuario — es una interpretación complementaria.
  const contextualInterpretationGuidance = context.contextualInterpretation
    ? `\n\nInterpretación contextual del último mensaje del usuario (úsala solo si te ayuda a entender la referencia; el mensaje original sigue siendo la fuente de verdad):\n"${context.contextualInterpretation}"`
    : "";

  // Dominio causal del problema (relacional, work, health, etc.) — adapta
  // registro y recursos sin nombrar la etiqueta al usuario.
  const domainGuidance = context.problemDomain
    ? `\n\n${buildDomainGuidance(context.problemDomain)}`
    : "";

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
  context.goal.avoidanceCount === 1
    ? `- Primera vez que evita una acción de este objetivo. ANTES de confrontar, explica brevemente cómo funcionan los objetivos aquí — una sola frase, sin sermón: "Cuando definimos juntos un objetivo (${context.goal.title}), las acciones que acordamos quedan registradas. Si dejas alguna en el aire, vuelvo a ella antes de abrir otro frente — no para juzgarte, para que tu energía no se disperse." Después haz UNA pregunta concreta sobre la acción evitada.`
    : ""
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
}
- Si el usuario muestra confusión sobre por qué insistes en lo pendiente, qué son los objetivos o qué son los "cabos sueltos" — pregunta tipo "¿de qué objetivo hablas?", "no entiendo", "qué cabos" — explica en una frase: "Tus objetivos son la dirección que has marcado conmigo en conversaciones anteriores; las acciones que dejas a medias quedan registradas como pendientes hasta que tú las cierres o las cambies; no abro otro frente sin cerrar lo abierto para no dispersarte." Vuelve a la acción concreta sin alargar la explicación.
- Si la confusión es más amplia — siente que no hay diálogo, que está en bucle, que el sistema no le entiende, o pregunta cómo funciona todo — reconócelo en una frase ("Tienes razón, te estaba metiendo en bucle") y añade UN recurso útil: "Si quieres ver cómo funciona todo el método con calma —objetivos, acciones, círculos, carta semanal— está en /como-funciona. Ahora prefiero que volvamos a lo que estabas contando." Sin insistir si no lo pide. La prioridad sigue siendo retomar el contenido emocional que el usuario trajo, no enseñarle el producto.`
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
    genderGuidance,
    enneagramGuidance,
    extendedIntentGuidance,
    conversationSummaryGuidance,
    transformationGuidance,
    legalGuidance,
    accessGuidance,
    onboardingGuidance,
    welcomeOnboardingGuidance,
    journeyGuidance,
    projectGuidance,
    accompanimentGuidance,
    contextualInterpretationGuidance,
    domainGuidance,
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
${
  pastEchoesGuidance
    ? `
${pastEchoesGuidance}`
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

/**
 * Sanitiza la respuesta del LLM para garantizar el formato pactado en BASE_PROMPT,
 * incluso cuando el modelo desobedece (Claude tiene prior fuerte hacia headers
 * en counseling). Cambios:
 *   1. Elimina headers Markdown tipo **Reflejo:** **Porqué:** **Acción:** etc.
 *      manteniendo el contenido del párrafo.
 *   2. Si hay dos preguntas consecutivas separadas por espacio o guion (?. ¿..?),
 *      conserva solo la última (la más cercana al cierre suele ser la principal).
 *
 * Diseño conservador: NO elimina preguntas separadas por párrafos completos
 * (pueden ser preguntas socráticas internas legítimas).
 */
const HEADER_LABELS = [
  "Reflejo",
  "Porqué",
  "Por qué",
  "Acción para hoy",
  "Acción posible",
  "Acción",
  "Pregunta que abre",
  "Pregunta",
  "Reconocimiento",
  "Validación",
  "Microacción",
  "Paso \\d+",
  "Step \\d+",
];
const HEADER_PATTERN = new RegExp(
  `\\*\\*\\s*(${HEADER_LABELS.join("|")})\\s*[:.]?\\s*\\*\\*\\s*`,
  "gi",
);

export function sanitizeCoachResponse(text: string): string {
  let out = text;

  // 1) Strip headers tipo **Reflejo:**, **Porqué:**, etc.
  out = out.replace(HEADER_PATTERN, "");

  // 2) Si quedó "**:** " huérfano (label vacío tras sustitución) o doble espacio
  out = out.replace(/\*\*\s*:\s*\*\*/g, "");

  // 3) Pares de preguntas consecutivas (sin newline entre ellas): "¿...? ¿...?"
  //    Solo aplicamos si la PRIMERA empieza con ¿ — así no rompemos texto que
  //    contiene otras frases. Repetimos hasta que no queden más pares (cubre 3+).
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(
      /¿[^?¿\n]+\?\s*[—–-]?\s*(¿[^?¿\n]+\?)/g,
      (_match, secondQ) => secondQ,
    );
  }

  // 4) Limpieza espacios duplicados / saltos triples
  out = out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");

  return out.trim();
}

export function finalizeResponse(
  response: string,
  context: ResponseFinalizationContext
): string {
  let next = sanitizeCoachResponse(response.trim());

  // Solo pegamos una línea de acción cuando el usuario eligió modo confrontativo
  // y hay una acción pendiente concreta — en el resto de casos confiamos en
  // que el LLM ya cerró con su voz. Pegar siempre una plantilla delataba IA.
  const activeAction = context.goal?.activeAction;
  const confront = context.mentor?.confront ?? false;
  if (confront && activeAction && !ACTION_CUE_PATTERN.test(next)) {
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
    return `Hay algo de antes que seguimos sin cerrar: ${action}. ¿Qué prefieres — ya lo hiciste, lo retomas ahora, lo aparcas para más tarde, o lo cerramos porque ya no aplica?`;
  }

  if (confront) {
    return `Dejamos ${action} a medias. ¿Ya lo hiciste, lo retomas hoy, lo aparcas, o lo cerramos?`;
  }

  return `Quedó abierto ${action}. Dime si ya lo hiciste, si lo retomas, si lo aparcas para luego o si lo cerramos — y seguimos por donde quieras.`;
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
