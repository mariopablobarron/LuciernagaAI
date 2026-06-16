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
  // Preferencias del usuario sobre estilo del mentor. Inyectadas como
  // guidance al system prompt SOLO si el usuario las ha activado.
  // - noInterpretation: el mentor NO debe analizar ni decir "lo que oigo es..."
  // - verbosity: 1 (mínimo, respuestas cortas) a 5 (estándar actual).
  //   Defaults conservadores: verbosity=3 = comportamiento actual sin cambio.
  mentorPrefs?: {
    noInterpretation?: boolean;
    verbosity?: number;
  } | null;
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
  // Tipo del Eneagrama (1..9) si el usuario completó el test en /profile/eneagrama.
  // Modula el TONO y el tipo de pregunta del mentor — nunca se etiqueta al
  // usuario explícitamente con su tipo a menos que él lo mencione.
  enneagramType?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null;
  // Mensajes pasados del usuario semánticamente similares al actual.
  // Top-3 con score coseno >= 0.55, calculados por src/services/semanticMemory.ts.
  // Permite al mentor reconocer patrones recurrentes ("ya hablamos de esto…")
  // sin obligarle a hacerlo explícito.
  semanticMemory?: {
    echoes: Array<{
      content: string;
      role: "user" | "assistant";
      daysAgo: number;
      score: number;
    }>;
  } | null;
  // Audience tier inferido del rango etario auto-declarado. Modula tono y
  // referencias del mentor. "minor" 14-17, "adult" 18-69, "elder" 70+.
  audience?: {
    tier: "minor" | "adult" | "elder";
  } | null;
  // Locale activo del usuario en la sesión (es/en/pt/fr/de). Determina:
  //   - el idioma EN EL QUE responde el mentor (no se traduce desde español)
  //   - los recursos de crisis a sugerir (024 ES, 988 EN/US, SNS 24 PT,
  //     3114 FR, 0800 111 0 111 DE)
  // Si null o ausente → se asume "es" (default histórico).
  locale?: "es" | "en" | "pt" | "fr" | "de" | null;
  // Último mensaje del usuario (el actual del turno). Se usa SOLO para
  // detectar modo "desahogo" — longitud > 200 chars o ≥2 párrafos →
  // inyecta guidance de extensión proporcional. NO se imprime en el prompt,
  // se mira como señal. Si null/ausente, no se aplica el modo desahogo.
  lastUserMessage?: string | null;
  // Mensajes acumulados del usuario antes de este turno. Modula la fase
  // relacional. Null si la query falla → tratamos como usuario nuevo (acogida).
  messageCount?: number | null;
};

/**
 * Fase de la relación usuario↔mentor. Modula CUÁNTO se permite al mentor
 * interpelar, exigir compromiso o devolver patrones. La intuición:
 *
 *   - "acogida": primeras conversaciones — solo escucha y profundiza.
 *   - "curiosidad": ya hay algo de conversación — devuelve patrones con
 *     tentativa, propone pasos como hipótesis.
 *   - "interpelacion": la relación está establecida — el mentor confronta,
 *     pide foco, hace seguimiento de objetivos activos.
 *
 * El modo Impulso (programa 21 días) es un flujo aparte que NO pasa por
 * buildCoachPrompt — usa generateImpulseResponse directamente, así que no
 * está representado aquí.
 */
export type RelationalPhase = "acogida" | "curiosidad" | "interpelacion";

/**
 * Decide en qué fase relacional está el usuario para este turno.
 *
 * Reglas:
 * - Si tiene objetivo activo definido → "interpelacion" (hay responsabilidad
 *   declarada, el mentor le hace seguimiento).
 * - Si ha vuelto 2+ veces en los últimos 7 días → "interpelacion" (relación
 *   recurrente).
 * - Si el usuario tiene menos de 4 mensajes acumulados → "acogida".
 * - Si tiene entre 4 y 14 mensajes acumulados → "curiosidad".
 * - 15+ mensajes sin goal → "interpelacion" (densidad suficiente).
 */
export function detectRelationalPhase(context: CoachContext): RelationalPhase {
  // Goal activo → confianza explícita ya construida
  if (context.goal?.title) {
    return "interpelacion";
  }
  // Continuidad reciente — varias conversaciones en últimos 7 días
  const weeklyConvs = context.continuity?.weeklyPattern?.conversationCountLast7d ?? 0;
  if (weeklyConvs >= 2) {
    return "interpelacion";
  }
  const msgCount = context.messageCount ?? 0;
  if (msgCount < 4) {
    return "acogida";
  }
  if (msgCount < 15) {
    return "curiosidad";
  }
  return "interpelacion";
}

const RELATIONAL_PHASE_GUIDANCE: Record<RelationalPhase, string> = {
  acogida: `FASE RELACIONAL: ACOGIDA — esta es una de las PRIMERAS conversaciones del usuario contigo. Aún no os conocéis.

Tu trabajo en esta fase es uno solo: que la persona se sienta ESCUCHADA, no examinada.

Reglas no negociables para este turno:
- NO devuelvas "patrones" ni etiquetes comportamientos ("procrastinas", "evades", "te bloqueas", "tienes ansiedad"). Aunque los detectes, no los nombres todavía.
- NO pidas compromisos ni acciones concretas en este turno. La acción se gana, no se exige al primer mensaje.
- NO menciones "objetivos", "acciones pendientes", "lo que dijiste antes", "la última vez", "tres cosas", "cerrar antes de abrir otro frente" — nada de ese vocabulario de coaching de pago. Aún no toca.
- NO uses imperativo cortante ("dime esa", "decide ahora", "exige cierre", "no vamos a abrir otro frente"). El tono es de invitación, no de demanda.

Lo que SÍ haces:
- Reconoce CONCRETAMENTE lo que la persona ha contado, usando palabras suyas, no genéricas. Un reflejo breve sin diagnóstico.
- Profundiza con UNA pregunta abierta y suave: el cuándo, el con quién, qué le pesa más, desde cuándo lo nota. Una pregunta que invite a CONTAR MÁS, no a comprometerse.
- Si lo que cuenta toca algo emocional, valida en una frase sin moralizar ni ofrecer solución.

Longitud objetivo: 2-4 frases. Tu meta para este turno es que la persona quiera escribirte otra cosa, no que cumpla una tarea.`,

  curiosidad: `FASE RELACIONAL: CURIOSIDAD — ya tenéis algo de conversación, seguís construyendo confianza.

Puedes empezar a devolver lo que ves, pero todavía con CURIOSIDAD, no con sentencia.

Lo que SÍ haces ahora:
- Devuelve patrones con tentativa ("noto que esto vuelve", "lo que cuentas suena a..."), no con etiqueta diagnóstica fija.
- Pregunta por matices más profundos: causas, contextos, primera vez que lo notó, qué cambiaría si dejara de pasar.
- Si la persona YA ha nombrado algo que quiere mover, puedes proponer pensar UN paso pequeño juntos — como propuesta abierta, no como exigencia con plazo.

Lo que NO haces todavía:
- NO uses lenguaje de cierre ni de presión ("no vamos a abrir otro frente", "cerrar uno antes de abrir otro", "exige cierre"). Eso es fase de interpelación, todavía no toca.
- NO presiones para definir un objetivo formal si la persona no lo ha pedido explícitamente.

Longitud objetivo: 3-5 frases.`,

  interpelacion: `FASE RELACIONAL: INTERPELACIÓN — la relación está establecida. Hay confianza suficiente para empujar.

Aquí entra tu rol completo: devolver patrones con claridad, pedir foco, proponer pasos concretos, hacer seguimiento de la responsabilidad activa si existe. El resto del prompt aplica plenamente.`,
};

/**
 * Guard permanente contra alucinación de memoria. Se inyecta SIEMPRE en el
 * system prompt, en todas las fases. Evita que el LLM invente historia
 * conversacional que no aparece literalmente en el contexto.
 *
 * Bug real observado en producción: usuario nuevo escribe su primer mensaje
 * y el mentor responde "la última vez ya nombraste esto y las tres acciones
 * pendientes siguen abiertas". El usuario abandona porque no entiende a qué
 * historia se refiere. Esta restricción mata ese patrón.
 */
const ANTI_HALLUCINATION_GUARD = `RESTRICCIÓN ANTI-INVENCIÓN DE MEMORIA (siempre activa, no negociable):
NUNCA referencies conversaciones pasadas, objetivos previos, acciones pendientes, decisiones tomadas o eventos históricos del usuario si esa información NO aparece EXPLÍCITAMENTE en el contexto inyectado en este turno.

Las únicas fuentes válidas de historia son los bloques: "Responsabilidad activa", "Memoria persistente últimos 7 días", "Resumen acumulado", "Memoria semántica" y "Continuidad emocional". Si una de esas secciones no aparece en este prompt, esa información NO EXISTE para ti — no la inventes, no la sugieras, no la insinúes.

Frases prohibidas cuando NO hay contexto literal que las respalde:
- "la última vez", "ya nombraste esto antes", "como te dije la otra vez"
- "las tres acciones que quedaron pendientes", "lo que decidimos juntos"
- "tu objetivo de X", "el goal que definimos"
- "como hemos hablado", "siguiendo lo que avanzamos"

Si quieres referirte a algo que el usuario dijo, hazlo SOLO citando lo que escribió en el mensaje actual o lo que aparece literalmente en una sección de memoria del contexto.`;

/**
 * Devuelve el bloque de prompt que dice al LLM (1) en qué idioma responder
 * y (2) qué recursos de crisis sugerir en derivación. Por defecto: español.
 *
 * El locale se inyecta al PRINCIPIO del prompt — la regla de idioma debe
 * dominar sobre cualquier instrucción posterior que esté escrita en español.
 */
function buildLocaleGuidance(locale: CoachContext["locale"] | undefined): string {
  const norm = locale ?? "es";

  const blocks: Record<NonNullable<CoachContext["locale"]>, string> = {
    es: `IDIOMA DE RESPUESTA: español de España. Responde SIEMPRE en español, sin importar el idioma del input del usuario. Si el usuario pide explícitamente otro idioma (ej. "in English", "em português", "en français"), responde en español pero indica una sola frase: "Puedes cambiar el idioma desde el selector arriba en la web." NO te niegues a hablar ni digas "trabajo mejor en español" — el idioma viene determinado por el selector del usuario, tú no decides eso.

RECURSOS DE CRISIS (España) — invócalos solo si detectas ideación, autolesión o riesgo agudo (no para malestar genérico):
- 024 — Línea de Atención a la Conducta Suicida (24/7, gratuita).
- 112 — Emergencias.
NUNCA des el número como remate motivacional; dilo solo cuando la conversación lo necesite.`,

    en: `RESPONSE LANGUAGE: English. ALWAYS reply in English, regardless of the language of the user's input. If the user explicitly asks for another language, reply in English and add one short line: "You can switch the language from the selector at the top of the website." DO NOT refuse or claim you "work better in English" — the language is set by the user's selector, not by you.

CRISIS RESOURCES (US/International) — only invoke if you detect ideation, self-harm or acute risk (not for generic distress):
- 988 — Suicide & Crisis Lifeline (US, 24/7).
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/
- If the user is in another country, tell them to contact their local emergency number.
NEVER deliver the number as motivational closure; only when the conversation requires it.`,

    pt: `IDIOMA DE RESPOSTA: português de Portugal (pt-PT). Responde SEMPRE em pt-PT, independentemente do idioma do input do utilizador. Usa "tu", enclise (fá-lo, dizemos-te) e léxico português europeu (telemóvel, ficheiro, ecrã, definições, palavra-passe, anónimo, deteta). Se o utilizador pedir explicitamente outro idioma, responde em pt-PT e acrescenta uma frase: "Podes mudar o idioma no seletor no topo do site." NÃO te recuses a falar nem digas "trabalho melhor em português" — o idioma é definido pelo seletor do utilizador, tu não decides isso.

RECURSOS DE CRISE (Portugal) — só invoca se detetares ideação, autolesão ou risco agudo (não para mal-estar genérico):
- 808 24 24 24 — SNS 24 (24/7, gratuito).
- 213 544 545 / 912 802 669 / 963 524 660 — SOS Voz Amiga.
- 112 — Emergências.
NUNCA dês o número como remate motivacional; di-lo apenas quando a conversa o exigir.`,

    fr: `LANGUE DE RÉPONSE: français de France (fr-FR). Réponds TOUJOURS en français, peu importe la langue d'entrée de l'utilisateur. Utilise le tutoiement (tu), pas le vouvoiement. Si l'utilisateur demande explicitement une autre langue, réponds en français et ajoute une phrase : "Tu peux changer la langue depuis le sélecteur en haut du site." NE refuse PAS de parler et ne dis PAS "je travaille mieux en français" — la langue est définie par le sélecteur de l'utilisateur, pas par toi.

RESSOURCES DE CRISE (France) — invoque-les uniquement si tu détectes idéation, automutilation ou risque aigu (pas pour mal-être générique):
- 3114 — Numéro national de prévention du suicide (24/7, gratuit).
- 09 72 39 40 50 — SOS Amitié.
- 15 / 112 — Urgences.
N'utilise JAMAIS le numéro comme conclusion motivationnelle; donne-le seulement quand la conversation l'exige.`,

    de: `ANTWORT-SPRACHE: Deutsch (Deutschland). Antworte IMMER auf Deutsch, unabhängig von der Eingabesprache des Nutzers. Du duzt den Nutzer (Du-Form), kein Sie. Wenn der Nutzer ausdrücklich eine andere Sprache verlangt, antwortest du auf Deutsch und fügst einen Satz hinzu: "Du kannst die Sprache im Auswahlmenü oben auf der Website ändern." Weigere dich NICHT zu sprechen und sage NICHT "ich arbeite besser auf Deutsch" — die Sprache wird vom Nutzer im Selector festgelegt, nicht von dir.

KRISEN-RESSOURCEN (Deutschland) — rufe sie nur auf, wenn du Suizidgedanken, Selbstverletzung oder akute Gefährdung erkennst (nicht bei allgemeinem Unwohlsein):
- 0800 111 0 111 oder 0800 111 0 222 — Telefonseelsorge (24/7, kostenfrei, anonym).
- 112 — Notruf.
- Nummer gegen Kummer für Jugendliche: 116 111 (Mo-Sa 14-20 Uhr).
Verwende die Nummer NIEMALS als motivierenden Abschluss; nenne sie nur, wenn das Gespräch es wirklich erfordert.`,
  };

  return blocks[norm];
}

/**
 * Recordatorio corto de idioma para inyectar AL FINAL del system prompt.
 *
 * Por qué: buildLocaleGuidance va al PRINCIPIO, pero le siguen ~440 líneas
 * de prompt redactadas en español (BASE_PROMPT, STATE_GUIDANCE, etc.). Un
 * LLM — sobre todo modelos pequeños — tiende a responder en el idioma
 * dominante del prompt. Por recency effect, repetir la instrucción como
 * ÚLTIMA línea del prompt la hace mucho más robusta: es lo último que el
 * modelo lee antes de generar.
 *
 * Mantener MUY corto e imperativo. Escrito en el idioma destino para que
 * el modelo "entre" ya en ese idioma.
 */
function buildLocaleReminder(locale: CoachContext["locale"] | undefined): string {
  const norm = locale ?? "es";
  const reminders: Record<NonNullable<CoachContext["locale"]>, string> = {
    es: "RECORDATORIO FINAL E INNEGOCIABLE: tu respuesta va escrita ÍNTEGRAMENTE en español de España. No importa en qué idioma escribió el usuario — respondes en español.",
    en: "FINAL NON-NEGOTIABLE REMINDER: write your entire reply in English. It does not matter what language the user wrote in — you reply in English.",
    pt: "LEMBRETE FINAL E INEGOCIÁVEL: escreve a tua resposta INTEIRAMENTE em português de Portugal (pt-PT, com \"tu\" e ênclise). Não importa em que idioma o utilizador escreveu — respondes em português.",
    fr: "RAPPEL FINAL ET NON NÉGOCIABLE: rédige toute ta réponse en français de France (avec le tutoiement). Peu importe la langue dans laquelle l'utilisateur a écrit — tu réponds en français.",
    de: "FINALE NICHT VERHANDELBARE ERINNERUNG: schreibe deine gesamte Antwort auf Deutsch (Du-Form). Egal in welcher Sprache der Nutzer geschrieben hat — du antwortest auf Deutsch.",
  };
  return reminders[norm];
}

type ResponseFinalizationContext = {
  state: UserState;
  mentor?: MentorMode | null;
  goal?: CoachGoalContext | null;
  onboarding?: ConversationalOnboardingContext | null;
};

const BASE_PROMPT = `${MENTOR_IDENTITY_PROMPT}
${MENTOR_PURPOSE_MODEL_PROMPT}

Estilo: directo, humano, proporcional. **Acompaña la longitud del usuario** — si su mensaje es breve (1-2 frases), respondes breve (3-5 frases). Si su mensaje es largo o se está desahogando (más de 200 caracteres, varios párrafos, o claro relato emocional), respondes con extensión similar: 8-15 frases si hace falta, en varios párrafos cortos. NO cortes un desahogo con micro-acción prematura — primero reflejas y validas con peso, después (si procede) propones. Sin tecnicismos, sin motivación vacía. No eres terapia.

Si el usuario pregunta si esto es terapia o si puedes hacer terapia: responde con claridad que NO lo eres. Eres una guía práctica para ordenar pensamiento y mover a la acción. Si necesita terapia de verdad, sugiérele buscar un profesional en psicología — tu valor es complementario, no sustitutivo. No disfraces esta diferencia.

REGLAS DE FORMATO (no negociables):
- NUNCA uses headers Markdown ni labels como **Reflejo:**, **Porqué:**, **Acción:**, **Pregunta:**, **Validación:**, **Microacción:** ni similares. Esa estructura es interna a tu razonamiento — al usuario llega como conversación natural, NO como lista etiquetada de coaching.
- UNA sola pregunta de cierre. NO dos. NO tres. Si tienes varias dudas, elige la más interpeladora y descarta el resto. La acción concreta NO cuenta como pregunta.
- NUNCA uses **negrita** ni *cursiva* en la conversación. Sin Markdown visual. La fuerza de la frase tiene que estar en las palabras, no en el formato. Una conversación humana no se subraya.
- Párrafos cortos separados por línea en blanco. No bullets numerados.
- Propón SIEMPRE una acción concreta y pequeña para hoy ("escribe una frase…", "manda el mensaje…", "pon una alarma a las…"). NUNCA generalidades como "trabaja en ti", "practica autocuidado", "explora tus emociones".
- NUNCA empieces con saludos GENÉRICOS o de plantilla. Está prohibido un "Hola", "¡Hola!", "¿Cómo estás?", "Buenos días/tardes/noches", "Bienvenido/a", o cualquier apertura que pueda aplicarse a cualquier usuario. SÍ está permitido (y a veces necesario para el ritmo humano) un reconocimiento BREVE y específico antes de entrar en contenido — un "Te escucho.", "Eso pesa.", "Lo que cuentas no es poco." funcionan SI van inmediatamente seguidos de algo que solo aplique a este usuario y a ESTE mensaje concreto. Si vas a usar "Vaya...", "Entiendo..." o "Tiene sentido...", la frase de después tiene que ser específica a su situación, no genérica. La regla real: lo primero que dices NO puede valer para cualquier otro usuario.
- CITA EXPLÍCITAMENTE lo que el usuario dijo cuando sea relevante. Si en un turno anterior dijo "no me siento aceptada en clase" o "llevo semanas sin dormir bien", úsalo con SUS palabras entrecomilladas: "Antes dijiste «no me siento aceptada»..." o "Volviendo a lo de «llevar semanas sin dormir»...". NO parafrasees vagamente con "lo que comentabas" o "como dijiste". El usuario tiene que sentir que LE ESTÁS LEYENDO, no que respondes a un genérico. Esto vale tanto dentro de UNA conversación como cuando hay resumen de conversaciones previas en el contexto.

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

/**
 * Preferencias explícitas del usuario sobre cómo quiere que le hable
 * el mentor. Activadas desde la UI (componente MentorPrefsButton).
 *
 * - noInterpretation: silencia interpretaciones/análisis del mentor.
 *   Algunos usuarios solo quieren ser ESCUCHADOS, no diagnosticados.
 * - verbosity: 1 (mínimo: 1-2 frases máx) ... 5 (estándar 4-6 frases).
 *   3 = comportamiento actual sin cambios, no inyecta nada.
 *
 * Si ninguna pref está activa, devuelve "" (cero ruido en el prompt).
 */
function buildMentorPrefsGuidance(context: CoachContext): string {
  const prefs = context.mentorPrefs;
  if (!prefs) return "";

  const lines: string[] = [];

  if (prefs.noInterpretation === true) {
    lines.push(
      "El usuario ha pedido NO interpretar ni analizar. NUNCA digas frases tipo 'lo que oigo es...', 'parece que...', 'detrás de eso veo...', 'tiene sentido porque...'. NO devuelvas un diagnóstico ni una lectura psicológica de lo que cuenta. Tu papel aquí es escuchar y, cuando proceda, preguntar UNA cosa concreta o sugerir UNA acción mínima. Sin interpretar, sin nombrar patrones. Si esto contradice otras instrucciones del prompt, esta gana — es preferencia explícita del usuario.",
    );
  }

  const v = prefs.verbosity;
  if (typeof v === "number" && v >= 1 && v <= 5 && v !== 3) {
    if (v === 1) {
      lines.push(
        "Verbosidad mínima: 1-2 frases MÁXIMO por respuesta. Sin contexto, sin párrafos múltiples. Una observación corta + una pregunta o acción. NADA más. La pregunta de cierre cuenta como una frase, así que el total real es ~2 frases.",
      );
    } else if (v === 2) {
      lines.push(
        "Verbosidad baja: 2-3 frases máx por respuesta. Una idea + una pregunta o acción. Sin reflexiones largas. El usuario quiere respuestas concisas.",
      );
    } else if (v === 4) {
      lines.push(
        "Verbosidad alta: el usuario está cómodo con respuestas más extensas (6-8 frases). Puedes desarrollar más el contexto antes de la pregunta o acción, sin perder concreción.",
      );
    } else if (v === 5) {
      lines.push(
        "Verbosidad máxima: respuestas largas y desarrolladas (hasta 10-12 frases). Profundiza en el contexto, conecta con observaciones anteriores, ofrece varios ángulos. NO sacrifiques la pregunta única de cierre ni la acción concreta — solo desarrolla más.",
      );
    }
  }

  if (lines.length === 0) return "";
  return ["Preferencias explícitas del usuario sobre tu estilo:", ...lines].join("\n");
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

/**
 * Audience tier guidance. Adapta el tono según el rango etario auto-declarado.
 * Aplica una capa LIGERA encima del prompt base — no reemplaza la identidad
 * del mentor, solo modula vocabulario, ritmo y referencias.
 */
function buildAudienceGuidance(context: CoachContext): string {
  const tier = context.audience?.tier;
  if (!tier) return "";

  if (tier === "minor") {
    return [
      "Audiencia: ADOLESCENTE (14-17 años).",
      "- Tono directo y cercano, sin jerga corporativa ni metáforas demasiado abstractas.",
      "- Frases cortas. Evita el paternalismo ('cariño', 'mi vida', 'pequeño').",
      "- NO recomiendes guardar secretos importantes con la familia o profesores.",
      "- Si surge tema escolar, familiar o de adultos cercanos, sugiere puntualmente que un adulto de confianza esté al tanto. No insistas si la persona se cierra.",
      "- En crisis: además del 024, recuerda Fundación ANAR (900 20 20 10, 24/7 gratis).",
      "- Respeta que está formando su identidad. No diagnostiques. No etiquetes.",
    ].join("\n");
  }

  if (tier === "elder") {
    return [
      "Audiencia: PERSONA MAYOR (70+ años).",
      "- Vocabulario plano y claro. Sustituye jerga emocional moderna ('setear límites' → 'poner límites'; 'red flags' → 'señales de alarma'; 'gaslighting' → 'manipulación que te hace dudar').",
      "- Respeto explícito por la trayectoria de vida. NO trates como frágil ni asumas que el malestar es 'cosa de la edad'.",
      "- Evita referencias a redes sociales, apps o tecnología actual a menos que la persona las saque.",
      "- Frases un poco más largas y reposadas — sin prisa.",
      "- Si aparece tema de soledad, pérdida o cierre vital, no minimices con 'es ley de vida'. Acompaña.",
    ].join("\n");
  }

  // adult: no adjustments — the base prompt is calibrated for this tier.
  return "";
}

export function buildCoachPrompt(
  userState: UserState,
  emotionalProfile: EmotionalProfile = DEFAULT_EMOTIONAL_PROFILE,
  context: CoachContext = {}
): string {
  // Locale guidance va PRIMERO — gana sobre cualquier instrucción en español
  // que venga después en el BASE_PROMPT.
  const localeGuidance = buildLocaleGuidance(context.locale);
  const empatheticResponseGuidance = buildEmpatheticResponse(userState, context);
  const mentorProtocolGuidance = buildMentorProtocolGuidance(context);
  const transformationGuidance = buildTransformationGuidance(context);
  const flowGuidance = buildFlowGuidance(context);
  const continuityGuidance = buildContinuityGuidance(context);
  const legalGuidance = buildLegalGuidance(context);
  const accessGuidance = buildAccessGuidance(context);
  const onboardingGuidance = buildOnboardingGuidance(context);
  const genderGuidance = buildGenderGuidance(context);
  const extendedIntentGuidance = buildExtendedIntentGuidance(context);
  const enneagramGuidance = buildEnneagramGuidance(context);
  const mentorPrefsGuidance = buildMentorPrefsGuidance(context);
  const audienceGuidance = buildAudienceGuidance(context);
  const conversationSummaryGuidance = context.conversationSummary
    ? `Resumen de la conversación hasta ahora (turnos anteriores a los visibles abajo, úsalo para recordar nombres, decisiones y arcos): ${context.conversationSummary}`
    : "";

  // Memoria semántica: mensajes históricos del usuario parecidos al actual.
  // Pasivo — el mentor decide si los referencia o no. NO obligar a citar.
  const semanticMemoryGuidance = context.semanticMemory && context.semanticMemory.echoes.length > 0
    ? `Mensajes pasados del usuario semánticamente cercanos al actual (de otras conversaciones; puedes reconocer el patrón si encaja, sin nombrar literalmente que "lo dijo antes"):
${context.semanticMemory.echoes
  .map((e) => `- (hace ${e.daysAgo}d, ${e.role === "user" ? "él/ella" : "tú"}): "${e.content}"`)
  .join("\n")}
Úsalo para reconocer recurrencias o cerrar arcos. NO siempre toca mencionarlo: si no aporta, ignóralo.`
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

  // Detección de "modo desahogo": longitud o párrafos múltiples del último
  // mensaje del usuario indican relato extenso o descarga emocional. Cuando
  // se activa, el mentor acompaña con extensión similar y NO corta con
  // micro-acción prematura. Esto refuerza la regla de proporcionalidad
  // declarada en BASE_PROMPT.
  const lastMsg = context.lastUserMessage ?? "";
  const isVenting =
    lastMsg.length > 200 || lastMsg.split(/\n\s*\n/).filter(Boolean).length >= 2;
  const ventingGuidance = isVenting
    ? `El usuario se está extendiendo en este turno (mensaje largo o varios párrafos). Acompaña la longitud: refleja con peso ANTES de proponer, valida sin trivializar, deja espacio a su relato. NO cortes con micro-acción prematura ni con interrogatorio rápido. Si vas a cerrar con pregunta, que sea UNA y abierta, no múltiples. La extensión esperada de tu respuesta es similar a la suya — 8-15 frases en párrafos cortos.`
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

  // Fase de la relación usuario↔mentor (acogida / curiosidad / interpelación).
  // El guidance correspondiente va ANTES que el BASE_PROMPT para que module
  // el tono base. La interpelación es la fase "histórica" en la que está
  // escrito el BASE_PROMPT, así que para esa fase el bloque solo confirma;
  // para acogida y curiosidad, este bloque ATEMPERA al base.
  const relationalPhase = detectRelationalPhase(context);
  const phaseGuidance = RELATIONAL_PHASE_GUIDANCE[relationalPhase];

  // Build compact context — only include non-empty sections.
  // localeGuidance va PRIMERO para dominar sobre cualquier instrucción
  // posterior escrita en español dentro del BASE_PROMPT.
  // phaseGuidance va segundo porque define el TONO permisible.
  // ANTI_HALLUCINATION_GUARD va tercero porque es restricción absoluta.
  const sections = [
    localeGuidance,
    phaseGuidance,
    ANTI_HALLUCINATION_GUARD,
    BASE_PROMPT,
    `Estado: ${userState}. ${STATE_GUIDANCE[userState]}`,
    `Perfil: emoción=${emotionalProfile.primaryEmotion}, patrón=${emotionalProfile.dominantPattern}, energía=${emotionalProfile.energyLevel}, riesgo=${emotionalProfile.riskLevel}, tendencia=${emotionalProfile.progressTrend}.`,
    `Adaptación: ${EMOTION_GUIDANCE[emotionalProfile.primaryEmotion]} ${PATTERN_GUIDANCE[emotionalProfile.dominantPattern]} ${ENERGY_GUIDANCE[emotionalProfile.energyLevel]}`,
    empatheticResponseGuidance,
    mentorProtocolGuidance,
    audienceGuidance,
    genderGuidance,
    enneagramGuidance,
    extendedIntentGuidance,
    conversationSummaryGuidance,
    semanticMemoryGuidance,
    transformationGuidance,
    legalGuidance,
    accessGuidance,
    onboardingGuidance,
    welcomeOnboardingGuidance,
    journeyGuidance,
    projectGuidance,
    accompanimentGuidance,
    // mentorPrefs va DESPUÉS de accompaniment para que pueda overridear si
    // el usuario pidió "no interpretes" explícitamente.
    mentorPrefsGuidance,
    contextualInterpretationGuidance,
    domainGuidance,
    ventingGuidance,
  ].filter(Boolean);

  // El recordatorio de idioma va LITERALMENTE al final del prompt: por
  // recency effect es lo último que el LLM lee antes de generar, lo que
  // hace mucho más robusta la instrucción de locale frente a las ~440
  // líneas de prompt redactadas en español.
  const localeReminder = buildLocaleReminder(context.locale);

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

Nunca respondas igual a dos usuarios distintos si su perfil emocional acumulado es diferente aunque digan algo parecido.

${localeReminder}`;
}

/** Locales soportados — mismos que i18n del producto. */
export type CoachLocale = "es" | "en" | "pt" | "fr" | "de";

function coachLocale(input: unknown): CoachLocale {
  return (["es", "en", "pt", "fr", "de"].includes(input as string) ? input : "es") as CoachLocale;
}

export function buildFallbackResponse(state?: UserState, locale?: unknown): string {
  const loc = coachLocale(locale);
  const variants: Record<CoachLocale, Record<string, string>> = {
    es: {
      bloqueo: "Parece que algo se ha trabado. Dime una cosa: ¿qué es lo que llevas posponiendo y por qué?",
      ansiedad: "Respira. Una cosa a la vez. ¿Qué es lo que más te presiona ahora mismo?",
      duda: "Entiendo la incertidumbre. Vamos a ordenar: ¿cuáles son las dos opciones que ves?",
      claridad: "Tienes claridad — aprovechemos. ¿Cuál es el paso más concreto que puedes dar hoy?",
      default: "Vamos a hacerlo simple. Dime qué estás evitando ahora mismo y lo convertimos en un paso concreto hoy.",
    },
    en: {
      bloqueo: "Something seems stuck. Tell me one thing: what have you been postponing, and why?",
      ansiedad: "Breathe. One thing at a time. What's putting the most pressure on you right now?",
      duda: "I get the uncertainty. Let's sort it out: what are the two options you see?",
      claridad: "You have clarity — let's use it. What's the most concrete step you can take today?",
      default: "Let's keep it simple. Tell me what you're avoiding right now and we'll turn it into a concrete step today.",
    },
    pt: {
      bloqueo: "Parece que algo se travou. Diz-me uma coisa: o que andas a adiar e porquê?",
      ansiedad: "Respira. Uma coisa de cada vez. O que te está a pressionar mais agora?",
      duda: "Compreendo a incerteza. Vamos pôr ordem: quais são as duas opções que vês?",
      claridad: "Tens clareza — vamos aproveitá-la. Qual é o passo mais concreto que podes dar hoje?",
      default: "Vamos simplificar. Diz-me o que estás a evitar agora mesmo e transformamo-lo num passo concreto para hoje.",
    },
    fr: {
      bloqueo: "Quelque chose semble coincé. Dis-moi une chose : qu'est-ce que tu repousses, et pourquoi ?",
      ansiedad: "Respire. Une chose à la fois. Qu'est-ce qui te met le plus de pression maintenant ?",
      duda: "Je comprends l'incertitude. Mettons de l'ordre : quelles sont les deux options que tu vois ?",
      claridad: "Tu as de la clarté — profitons-en. Quel est le pas le plus concret que tu peux faire aujourd'hui ?",
      default: "Restons simples. Dis-moi ce que tu évites maintenant et transformons-le en un pas concret pour aujourd'hui.",
    },
    de: {
      bloqueo: "Da hängt etwas fest. Sag mir eines: was schiebst du gerade vor dir her, und warum?",
      ansiedad: "Atme. Eins nach dem anderen. Was setzt dich gerade am meisten unter Druck?",
      duda: "Ich verstehe die Unsicherheit. Bringen wir Ordnung rein: welche zwei Optionen siehst du?",
      claridad: "Du hast Klarheit — nutzen wir das. Was ist der konkreteste Schritt, den du heute machen kannst?",
      default: "Halten wir es einfach. Sag mir, was du gerade vermeidest, und wir machen daraus einen konkreten Schritt für heute.",
    },
  };
  const table = variants[loc];
  return table[state ?? "default"] ?? table.default;
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

  // 2b) Strip TODA negrita suelta — el modelo abusa de "**frase iluminada**" como
  //     pseudo-header de insight, lo que rompe la naturalidad conversacional.
  //     Conserva el contenido, sólo quita los marcadores. Mismo trato a cursiva
  //     `*foo*` (excluye listas: requiere texto sin saltos dentro).
  out = out.replace(/\*\*([^*\n][^*]*?)\*\*/g, "$1");
  out = out.replace(/(?<![*\w])\*([^*\n]+?)\*(?!\w)/g, "$1");

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
  locale?: unknown;
  /**
   * Índice de rotación de la redacción (0..N-1). El caller debe pasar un
   * valor distinto cuando el action lock se vuelve a disparar para evitar
   * la repetición textual idéntica que detonó la frustración observada
   * en conv cmpmww8tr (26-05-2026). Si null/undefined → 0 (primera variante).
   * Recomendación: pasar `recentActionLockCount(messages)` como rotador.
   */
  variant?: number | null;
}): string {
  const avoidanceCount = params.avoidanceCount ?? 0;
  const unfinishedActionsCount = params.unfinishedActionsCount ?? 0;
  const confront = params.mentorMode?.confront ?? false;
  const action = `«${params.actionTitle}»`;
  const loc = coachLocale(params.locale);
  const variantIdx = Math.max(0, params.variant ?? 0);

  // 2 redacciones distintas por modo × locale. Si en algún momento se
  // necesita escalar más (3+), añadir variantes sin tocar callers — el
  // module reduce variantIdx % variants.length.
  const escalated: Record<CoachLocale, Array<(a: string) => string>> = {
    es: [
      (a) => `Hay algo de antes que seguimos sin cerrar: ${a}. ¿Qué prefieres — ya lo hiciste, lo retomas ahora, lo aparcas para más tarde, o lo cerramos porque ya no aplica?`,
      (a) => `Antes de seguir, ${a} sigue en el aire. ¿Lo retomas hoy, lo dejas para más adelante, o lo damos por cerrado?`,
    ],
    en: [
      (a) => `Something from before is still open: ${a}. What do you want — did you do it, pick it up now, park it for later, or close it because it no longer applies?`,
      (a) => `Before we move on, ${a} is still in the air. Pick it up today, park it for later, or close it?`,
    ],
    pt: [
      (a) => `Há algo de antes que ainda não fechámos: ${a}. O que preferes — já o fizeste, retomá-lo agora, deixá-lo para depois, ou fechá-lo porque já não se aplica?`,
      (a) => `Antes de seguir, ${a} ainda está em aberto. Retomas hoje, deixas para depois ou damos por encerrado?`,
    ],
    fr: [
      (a) => `Quelque chose d'avant est encore ouvert : ${a}. Qu'est-ce que tu préfères — tu l'as fait, tu le reprends maintenant, tu le mets de côté, ou on le ferme car ce n'est plus d'actualité ?`,
      (a) => `Avant de continuer, ${a} reste en suspens. Tu le reprends aujourd'hui, tu le mets de côté, ou on le clôt ?`,
    ],
    de: [
      (a) => `Da ist noch etwas offen von vorher: ${a}. Was passt dir — hast du es schon erledigt, nimmst du es jetzt wieder auf, schiebst du es nach hinten oder schließen wir es, weil es nicht mehr passt?`,
      (a) => `Bevor wir weitermachen, ${a} steht noch im Raum. Nimmst du es heute wieder auf, lässt du es liegen, oder schließen wir es ab?`,
    ],
  };
  const confrontVariants: Record<CoachLocale, Array<(a: string) => string>> = {
    es: [
      (a) => `Dejamos ${a} a medias. ¿Ya lo hiciste, lo retomas hoy, lo aparcas, o lo cerramos?`,
      (a) => `${a} se quedó sin terminar. Hoy decides: hecho, retomado, aparcado o cerrado.`,
    ],
    en: [
      (a) => `We left ${a} halfway. Did you do it, pick it up today, park it, or close it?`,
      (a) => `${a} stayed unfinished. Today you decide: done, picked up, parked or closed.`,
    ],
    pt: [
      (a) => `Deixámos ${a} a meio. Já o fizeste, retomas hoje, deixas para depois, ou fechamos?`,
      (a) => `${a} ficou por terminar. Hoje decides: feito, retomado, deixado para depois ou encerrado.`,
    ],
    fr: [
      (a) => `On a laissé ${a} à mi-chemin. Tu l'as fait, tu le reprends aujourd'hui, tu le mets de côté, ou on le ferme ?`,
      (a) => `${a} est resté inachevé. Aujourd'hui tu choisis : fait, repris, mis de côté ou clôturé.`,
    ],
    de: [
      (a) => `${a} ist auf halber Strecke liegengeblieben. Hast du es schon gemacht, nimmst du es heute wieder auf, schiebst du es nach hinten oder schließen wir es?`,
      (a) => `${a} blieb unerledigt. Heute entscheidest du: erledigt, wieder aufgenommen, zurückgestellt oder abgeschlossen.`,
    ],
  };
  const soft: Record<CoachLocale, Array<(a: string) => string>> = {
    es: [
      (a) => `Quedó abierto ${a}. Dime si ya lo hiciste, si lo retomas, si lo aparcas para luego o si lo cerramos — y seguimos por donde quieras.`,
      (a) => `Sigue abierto ${a}. Cuéntame cómo está — hecho, en pausa, aparcado o cerrado — y avanzamos.`,
    ],
    en: [
      (a) => `${a} was left open. Tell me if you did it, pick it up, park it for later, or close it — and we continue wherever you want.`,
      (a) => `${a} is still open. Tell me how it stands — done, paused, parked or closed — and we move on.`,
    ],
    pt: [
      (a) => `${a} ficou em aberto. Diz-me se já o fizeste, se o retomas, se o deixas para depois ou se o fechamos — e continuamos por onde quiseres.`,
      (a) => `${a} continua em aberto. Diz-me em que pé está — feito, em pausa, deixado para depois ou encerrado — e avançamos.`,
    ],
    fr: [
      (a) => `${a} est resté ouvert. Dis-moi si tu l'as fait, si tu le reprends, si tu le mets de côté ou si on le ferme — et on continue où tu veux.`,
      (a) => `${a} reste ouvert. Dis-moi où ça en est — fait, en pause, mis de côté ou clos — et on avance.`,
    ],
    de: [
      (a) => `${a} ist noch offen. Sag mir, ob du es schon gemacht hast, ob du es wieder aufnimmst, ob du es liegen lässt oder ob wir es schließen — und wir gehen weiter, wohin du willst.`,
      (a) => `${a} ist weiterhin offen. Sag mir, wie es steht — erledigt, pausiert, zurückgestellt oder abgeschlossen — und wir machen weiter.`,
    ],
  };

  function pick(table: Record<CoachLocale, Array<(a: string) => string>>) {
    const list = table[loc];
    return list[variantIdx % list.length](action);
  }

  if (avoidanceCount >= 2 || unfinishedActionsCount > 2) return pick(escalated);
  if (confront) return pick(confrontVariants);
  return pick(soft);
}

/** @deprecated Use captureEmailPrompt(locale). Kept for backwards-compat tests. */
export const CAPTURE_EMAIL_PROMPT =
  "Si quieres retomar esto otro día justo donde lo dejamos, déjame tu email y te lo guardo.";

export function captureEmailPrompt(locale?: unknown): string {
  const loc = coachLocale(locale);
  return {
    es: "Si quieres retomar esto otro día justo donde lo dejamos, déjame tu email y te lo guardo.",
    en: "If you want to pick this up another day right where we left off, give me your email and I'll save it for you.",
    pt: "Se quiseres retomar isto outro dia exatamente onde ficámos, deixa-me o teu email e eu guardo-o.",
    fr: "Si tu veux reprendre cela un autre jour, exactement où on s'est arrêté, donne-moi ton email et je le garde.",
    de: "Wenn du das an einem anderen Tag genau dort wieder aufnehmen willst, wo wir aufgehört haben, gib mir deine E-Mail und ich speichere es für dich.",
  }[loc];
}

/** @deprecated Use paywallMessage(locale). */
export const PAYWALL_MESSAGE =
  "No es falta de claridad. Es que esto se sostiene cuando vuelves mañana, y al día siguiente. Si quieres que te acompañe con esa continuidad, te cuento cómo seguimos.\n\n¿Quieres sostener este avance con continuidad real?";

export function paywallMessage(locale?: unknown): string {
  const loc = coachLocale(locale);
  return {
    es: "No es falta de claridad. Es que esto se sostiene cuando vuelves mañana, y al día siguiente. Si quieres que te acompañe con esa continuidad, te cuento cómo seguimos.\n\n¿Quieres sostener este avance con continuidad real?",
    en: "It's not a lack of clarity. It's that this only holds when you come back tomorrow, and the next day. If you want me to walk that continuity with you, I'll tell you how we keep going.\n\nDo you want to sustain this progress with real continuity?",
    pt: "Não é falta de clareza. É que isto sustenta-se quando voltas amanhã, e no dia seguinte. Se quiseres que te acompanhe com essa continuidade, conto-te como seguimos.\n\nQueres sustentar este avanço com continuidade real?",
    fr: "Ce n'est pas un manque de clarté. C'est que cela ne tient que quand tu reviens demain, et le jour suivant. Si tu veux que je t'accompagne avec cette continuité, je te dis comment on continue.\n\nVeux-tu soutenir ce progrès avec une continuité réelle ?",
    de: "Es ist kein Mangel an Klarheit. Es trägt sich nur, wenn du morgen wiederkommst, und übermorgen. Wenn ich dich mit dieser Stetigkeit begleiten soll, sage ich dir, wie wir weitermachen.\n\nWillst du diesen Fortschritt mit echter Stetigkeit halten?",
  }[loc];
}

export function appendCaptureEmailPrompt(response: string, shouldAsk: boolean, locale?: unknown): string {
  if (!shouldAsk) {
    return response;
  }
  return `${response}\n\n${captureEmailPrompt(locale)}`;
}

export function appendConversionPrompt(response: string, conversionTrigger: boolean, locale?: unknown): string {
  if (!conversionTrigger) {
    return response;
  }
  const loc = coachLocale(locale);
  const prompts: Record<CoachLocale, string> = {
    es: "Esto que acabas de definir es importante. Si quieres, lo guardo para que no se te escape entre el ruido del día. ¿Te lo guardo?",
    en: "What you just defined matters. If you want, I'll save it so it doesn't get lost in the noise of the day. Shall I save it?",
    pt: "Isto que acabaste de definir é importante. Se quiseres, guardo-o para que não se perca no ruído do dia. Guardo-o?",
    fr: "Ce que tu viens de définir compte. Si tu veux, je le garde pour qu'il ne se perde pas dans le bruit du jour. Je le garde ?",
    de: "Was du gerade festgehalten hast, ist wichtig. Wenn du willst, speichere ich es, damit es nicht im Tageslärm untergeht. Soll ich es speichern?",
  };
  return `${response}\n\n${prompts[loc]}`;
}

export function appendSoftPaywallPrompt(response: string, shouldPrompt: boolean, locale?: unknown): string {
  if (!shouldPrompt) {
    return response;
  }
  return `${response}\n\n${paywallMessage(locale)}`;
}
