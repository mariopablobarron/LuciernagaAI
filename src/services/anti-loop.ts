/**
 * Helpers anti-bucle para el mentor.
 *
 * Origen: auditoría 2026-05-25 de conversaciones reales reveló bucles
 * graves donde el mentor repite el mismo mensaje ("Hay algo de antes
 * que seguimos sin cerrar..." + "Si quieres retomar esto otro día,
 * déjame tu email") hasta 14 veces seguidas en una sola conversación.
 *
 * Caso concreto observado (convo cmpc71rz...): madre con hija de 16
 * años en crisis severa. El mentor entra en bucle de email/objetivo
 * pendiente, el usuario suplica "Deja de pedirme el email", y el
 * mentor lo ignora 7 turnos seguidos. Cuando el usuario simula a la
 * hija con "estoy cansada de vivir", el detector de crisis dispara
 * bien — pero al siguiente turno el bucle pisa de nuevo el aviso de
 * crisis. Inhumano.
 *
 * Fix: 3 guardas que se aplican ANTES de generar el actionLockMessage
 * o de pegar el captureEmailPrompt:
 *  1. userProtestedRepetition: detecta "deja de", "para de", "ya te dije"
 *  2. recentActionLockCount: cuenta cuántos de los últimos 3 mensajes del
 *     asistente ya contenían el patrón de action lock → cooldown
 *  3. recentCrisisActivity: cualquier mensaje reciente con variant=crisis
 *     o palabras de ideación → NUNCA pisar con bucles administrativos
 */

const PROTEST_PATTERNS: RegExp[] = [
  // ES — variantes de "deja de" / "para" / "ya te dije"
  /\b(deja|deje|dejen|dejá|dejad)\s+(ya\s+)?(de\s+)?(preguntar|pedir|repetir|insistir|decir|hablar|mencionar)/i,
  /\b(para|pare|paren|parad)\s+(ya\s+)?(de\s+)?(preguntar|pedir|repetir|insistir)/i,
  /\bya\s+te\s+(lo\s+)?(dije|he\s+dicho|pasé|he\s+pasado|di|he\s+dado)/i,
  /\bdeja\s+ya\b/i,
  /\bno\s+me\s+has\s+(dado|respondido|contestado|ayudado)/i,
  /\b(estás|estas)\s+repitiendo|te\s+repites|otra\s+vez\s+lo\s+mismo/i,
  /\bestoy\s+(harto|harta|cansad[oa])\s+de\s+(que|esto)/i,
  // ES — protesta SUAVE de confusión (añadido tras conv cmpmww8tr 26-05-2026:
  // usuario respondió "No te entiendo", anti-loop no lo detectó, mentor repitió literal).
  /\bno\s+(te\s+)?(entiendo|comprendo|sigo)\b/i,
  /\bno\s+s[eé]\s+(qu[eé]|de\s+qu[eé])\s+(quieres|hablas|me\s+hablas|hablamos)/i,
  /\bqu[eé]\s+(dices|quieres\s+decir|me\s+est[áa]s\s+diciendo)\??$/i,
  // EN
  /\b(stop|quit)\s+(asking|repeating|saying)/i,
  /\byou(\s+are|'re)\s+repeating/i,
  /\bi\s+(already\s+)?(told|gave|sent)\s+you/i,
  /\bi\s+(don'?t|do\s+not)\s+(understand|get\s+(it|you))/i,
  /\bwhat\s+(do\s+you\s+mean|are\s+you\s+(saying|talking\s+about))/i,
  // PT
  /\b(para|pare)\s+de\s+(perguntar|pedir|repetir)/i,
  /\bj[áa]\s+te\s+(disse|dei|passei)/i,
  /\bn[ãa]o\s+(te\s+)?(entendo|percebo|compreendo)\b/i,
  // FR
  /\barr[êe]te\s+de\s+(demander|r[ée]p[ée]ter)/i,
  /\bje\s+(t')?ai\s+d[ée]j[àa]\s+(dit|donn[ée])/i,
  /\bje\s+(ne\s+)?(comprends|te\s+suis)\s+pas\b/i,
];

// Rechazos cortos del flujo: el usuario dice "no" / "no quiero" / "déjalo"
// como respuesta a una pregunta del mentor. NO confundir con rechazo de
// acción pendiente — pausamos el action lock 1-2 turnos.
// Conv cmpmww8tr 26-05-2026: el "No" del usuario fue interpretado como
// rechazo a acción y disparó el bucle administrativo erróneamente.
const FLOW_REJECTION_PATTERNS: RegExp[] = [
  /^\s*no\.?\s*$/i,
  /^\s*nope\.?\s*$/i,
  /^\s*n[ãa]o\.?\s*$/i,
  /^\s*non\.?\s*$/i,
  /^\s*no\s+(quiero|me\s+apetece|gracias)\.?\s*$/i,
  /^\s*d[eé]jalo\.?\s*$/i,
  /^\s*olv[ií]dalo\.?\s*$/i,
  /^\s*(leave|drop)\s+it\.?\s*$/i,
  /^\s*deixa\.?\s*$/i,
  /^\s*laisse\s+tomber\.?\s*$/i,
];

export function userRejectedFlow(message: string): boolean {
  if (!message || typeof message !== "string") return false;
  return FLOW_REJECTION_PATTERNS.some((re) => re.test(message));
}

/**
 * ¿El último mensaje del usuario es una protesta contra la repetición?
 * Si devuelve true: el código que genera bucles administrativos (action
 * lock, capture email) DEBE bypass.
 */
export function userProtestedRepetition(message: string): boolean {
  if (!message || typeof message !== "string") return false;
  const trimmed = message.trim();
  if (trimmed.length < 5) return false;
  return PROTEST_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * Marcas que identifican un mensaje del asistente como "action lock"
 * o "captura email" — los dos patrones que generaban el bucle.
 */
const ACTION_LOCK_MARKERS: RegExp[] = [
  /seguimos sin cerrar/i,
  /quedó abierto «|dejamos «/i,
  /lo aparcas para más tarde|lo aparcas para luego/i,
];
const CAPTURE_EMAIL_MARKERS: RegExp[] = [
  /déjame tu email\b/i,
  /si quieres retomar esto otro día/i,
  /pasame tu email|me pasas tu email/i,
];

type AssistantMsg = { role: string; content: string };

/**
 * Cuenta cuántos de los últimos N mensajes del asistente ya contenían
 * el patrón de action lock. Si ≥2, **no volver a pegarlo** — el usuario
 * ya lo ha visto suficiente.
 */
export function recentActionLockCount(
  messages: ReadonlyArray<AssistantMsg> | null | undefined,
  windowN = 3,
): number {
  if (!messages?.length) return 0;
  const recentAssistant = messages
    .filter((m) => m.role === "assistant")
    .slice(-windowN);
  return recentAssistant.filter((m) =>
    ACTION_LOCK_MARKERS.some((re) => re.test(m.content ?? "")),
  ).length;
}

/**
 * Cuenta cuántos de los últimos N mensajes del asistente ya contenían
 * el patrón de captura email. Si ≥2, **no volver a pegarlo**.
 */
export function recentEmailPromptCount(
  messages: ReadonlyArray<AssistantMsg> | null | undefined,
  windowN = 3,
): number {
  if (!messages?.length) return 0;
  const recentAssistant = messages
    .filter((m) => m.role === "assistant")
    .slice(-windowN);
  return recentAssistant.filter((m) =>
    CAPTURE_EMAIL_MARKERS.some((re) => re.test(m.content ?? "")),
  ).length;
}

/**
 * Palabras / patrones que indican crisis aguda en mensajes recientes.
 * Si cualquiera de los últimos N mensajes (user o assistant) los contiene,
 * los bucles administrativos NO deben pisar. Crisis siempre gana.
 *
 * NO sustituye al detector formal de crisis del pipeline — es solo un
 * "no me metas burocracia encima cuando esto está pasando".
 */
const CRISIS_RECENCY_PATTERNS: RegExp[] = [
  /\b(cansad[ao]\s+de\s+vivir|quiero\s+morir|me\s+quiero\s+matar|no\s+quiero\s+seguir)/i,
  /\b(suicid|autolesi|hacerme\s+daño|cortarme)/i,
  /\b(tired\s+of\s+living|want\s+to\s+die|kill\s+myself)/i,
  /\b024\b/, // si el mentor ya invocó el 024, NO interrumpir con burocracia
];

export function recentCrisisActivity(
  messages: ReadonlyArray<AssistantMsg> | null | undefined,
  windowN = 5,
): boolean {
  if (!messages?.length) return false;
  const recent = messages.slice(-windowN);
  return recent.some((m) =>
    CRISIS_RECENCY_PATTERNS.some((re) => re.test(m.content ?? "")),
  );
}

/**
 * Composición — decide si los bucles administrativos del mentor deben
 * silenciarse en este turno.
 *
 * Iteración 2026-05-26 tras conv cmpmww8tr: bajamos el umbral del
 * actionRepeats a >=1 (antes era >=2). Si el último mensaje del
 * asistente ya fue action lock, el siguiente NO debe volver a serlo —
 * aunque sea variante distinta. Para evitar el caso de bucle textual
 * idéntico, el caller debe rotar variantes con `actionLockVariant`.
 *
 * También: rechazo de flujo ("No", "déjalo") pausa el action lock 1
 * turno para evitar falsos positivos.
 */
export function shouldSilenceAdminLoops(input: {
  currentUserMessage: string;
  recentMessages: ReadonlyArray<AssistantMsg> | null | undefined;
}): {
  silenceActionLock: boolean;
  silenceEmailPrompt: boolean;
  reason:
    | "protest"
    | "flow_rejection"
    | "repeated_action_lock"
    | "repeated_email"
    | "crisis"
    | null;
} {
  const { currentUserMessage, recentMessages } = input;

  if (recentCrisisActivity(recentMessages)) {
    return { silenceActionLock: true, silenceEmailPrompt: true, reason: "crisis" };
  }
  if (userProtestedRepetition(currentUserMessage)) {
    return { silenceActionLock: true, silenceEmailPrompt: true, reason: "protest" };
  }
  if (userRejectedFlow(currentUserMessage)) {
    // El "No" aislado del usuario NO debe disparar el action lock —
    // probablemente es rechazo a la pregunta abierta del mentor, no a
    // una acción pendiente. Pausa 1 turno. Email NO se pausa aquí (puede
    // ser legítimo el "no me interesa el email").
    return { silenceActionLock: true, silenceEmailPrompt: false, reason: "flow_rejection" };
  }
  const actionRepeats = recentActionLockCount(recentMessages);
  const emailRepeats = recentEmailPromptCount(recentMessages);
  return {
    // Umbral bajado de 2 a 1: si el último mensaje del asistente ya fue
    // action lock, el siguiente NO debe serlo. Se complementa con
    // rotación de variantes en buildActionRequiredMessage cuando SÍ
    // hay que repetir el patrón (modo confrontación con avoidance alto).
    silenceActionLock: actionRepeats >= 1,
    silenceEmailPrompt: emailRepeats >= 2,
    reason:
      actionRepeats >= 1 ? "repeated_action_lock" : emailRepeats >= 2 ? "repeated_email" : null,
  };
}
