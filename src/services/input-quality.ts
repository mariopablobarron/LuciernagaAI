/**
 * Detector de calidad del input del usuario — para interceptar mensajes
 * ambiguos / gibberish / demasiado cortos ANTES de mandarlos al LLM.
 *
 * Origen: auditoría 2026-05-25 de conversaciones reales reveló convo
 * con "Hoka" → fallback genérico → "Hzhshdhs" → MISMA respuesta → "No
 * lo sé" → MISMA respuesta. Tres turnos consecutivos con plantilla
 * idéntica. El usuario abandona.
 *
 * Por qué client-side primero (no LLM):
 *  - Coste: cada llamada al LLM cuesta. Gibberish no merece llamada.
 *  - Latencia: la respuesta es instantánea (no espera al stream).
 *  - Determinismo: el fallback varía, no repite literal.
 *
 * NO confundir con "input vacío" — eso ya lo bloquea el orchestrator.
 * Aquí cazamos input con CONTENIDO pero sin SIGNIFICADO procesable.
 */

export type InputQuality =
  | { kind: "ok" }
  | { kind: "empty"; reason: "blank" | "whitespace_only" }
  | { kind: "too_short"; chars: number }
  | { kind: "gibberish"; reason: "no_vowels" | "repeated_char" | "no_word_structure" }
  | { kind: "ambiguous_short_reply"; word: string };

// Respuestas válidas de 1-3 chars que NO son ambiguas (afirmación, negación, etc.).
// Si el contexto previo es una pregunta del mentor, estas respuestas son
// significativas y NO deben interceptarse.
const VALID_SHORT_REPLIES = new Set([
  // ES
  "si", "sí", "no", "ok", "vale", "yep", "nop", "uf", "dale",
  // EN
  "yes", "yep", "yeah", "nope", "nah", "sure",
  // PT
  "sim", "não", "nao", "ok",
  // FR
  "oui", "non", "ouais",
]);

const VOWEL_RE = /[aeiouáéíóúäëïöüâêîôûàèìòùãõ]/i;
// Palabras de 2+ chars — permite "No lo se", "Bom dia" como input válido.
// El umbral 3 era demasiado estricto y daba falsos positivos.
const WORD_RE = /[a-záéíóúñü]{2,}/i;

/**
 * Evalúa la calidad del input. NO modifica el mensaje. Returns shape
 * estricto para que el caller decida qué hacer (intercept vs procesar).
 */
export function assessInputQuality(raw: string): InputQuality {
  if (typeof raw !== "string") return { kind: "empty", reason: "blank" };

  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: "empty", reason: "blank" };

  // Solo espacios o caracteres "vacíos" ( , tabs, etc.)
  if (!/\S/.test(trimmed)) return { kind: "empty", reason: "whitespace_only" };

  const lower = trimmed.toLowerCase();

  // Respuestas cortas válidas — el caller decidirá según contexto si las
  // procesa normalmente o pide más concreción.
  if (lower.length <= 4 && VALID_SHORT_REPLIES.has(lower)) {
    return { kind: "ambiguous_short_reply", word: lower };
  }

  // Mensajes muy cortos pero no del set válido → ambiguo.
  // Threshold: <5 chars Y no estar en VALID_SHORT_REPLIES.
  if (trimmed.length < 5) {
    return { kind: "too_short", chars: trimmed.length };
  }

  // Gibberish detection: 3 heurísticas conservadoras.
  // Solo dispara si el mensaje parece ser una cadena aleatoria, NO si es
  // simplemente corto o informal.

  // 1. Sin vocales — improbable en texto humano real
  //    ej: "Hzhshdhs", "ksjdfh", "rtprt"
  if (!VOWEL_RE.test(trimmed)) {
    return { kind: "gibberish", reason: "no_vowels" };
  }

  // 2. Baja diversidad de caracteres (gibberish basado en repetición).
  //    Heurística: chars UNIQUE / total. Texto humano corto tiene
  //    diversidad alta; gibberish la tiene baja.
  //
  //    CRÍTICO: el alfabeto es FINITO (~26 letras + acentos). Para
  //    mensajes largos legítimos, la diversidad ABSOLUTA cae naturalmente
  //    porque las letras se repiten. Un texto de 100 chars con 28 únicos
  //    da 0.28 — debajo de cualquier threshold fijo.
  //
  //    Fix incidente 2026-06-19 (auditoría externa reveló que mensajes
  //    emocionales reales de 100-300 chars se marcaban como gibberish y
  //    nunca llegaban al LLM, recibían fallback scripted):
  //    - SOLO aplicamos esta heurística a strings ENTRE 7 y 40 chars.
  //    - Para >40 chars confiamos en que es texto real. Si fuera
  //      gibberish largo (raro), las otras heurísticas (vocales,
  //      WORD_RE) lo cazarían antes.
  const nospace = trimmed.replace(/\s/g, "").toLowerCase();
  if (nospace.length >= 7 && nospace.length <= 40) {
    const unique = new Set(nospace).size;
    const diversity = unique / nospace.length;
    if (diversity < 0.3) {
      return { kind: "gibberish", reason: "repeated_char" };
    }
  }

  // 3. Sin estructura de palabra real — ninguna secuencia de ≥3 letras
  //    válidas seguidas. Captura "Hoka 1 2 3" pero deja pasar "ok yes".
  //    Solo se aplica si el mensaje tiene ≥6 chars (más conservador).
  if (trimmed.length >= 6 && !WORD_RE.test(trimmed)) {
    return { kind: "gibberish", reason: "no_word_structure" };
  }

  return { kind: "ok" };
}

/**
 * Variantes de respuesta para input ambiguo, en 4 idiomas.
 * Rotación pseudo-aleatoria basada en un seed estable (idx del turno)
 * para que el usuario nunca vea la misma respuesta 2 veces seguidas.
 */
const AMBIGUOUS_INPUT_PROMPTS: Record<"es" | "en" | "pt" | "fr" | "de", string[]> = {
  es: [
    "No me has dado mucho con lo que trabajar. Cuéntame algo concreto: ¿qué hay en tu cabeza ahora?",
    "Necesito algo más para ayudarte. ¿Qué te ha hecho abrir el chat hoy?",
    "Empieza por una frase entera, aunque sea torpe. ¿Qué es lo que más te pesa ahora mismo?",
    "Dame algo más. Una palabra no me llega. ¿Qué quieres mirar hoy?",
  ],
  en: [
    "I don't have much to work with there. Tell me something concrete: what's on your mind right now?",
    "I need a bit more to help. What made you open the chat today?",
    "Start with a full sentence, even if it's clumsy. What weighs on you most right now?",
    "Give me a bit more. One word isn't enough. What do you want to look at today?",
  ],
  pt: [
    "Não me deste muito com que trabalhar. Diz-me algo concreto: o que tens na cabeça agora?",
    "Preciso de mais para te ajudar. O que te fez abrir o chat hoje?",
    "Começa por uma frase inteira, mesmo que desajeitada. O que mais te pesa agora mesmo?",
    "Dá-me mais. Uma palavra não chega. O que queres olhar hoje?",
  ],
  fr: [
    "Tu ne m'as pas donné grand-chose. Dis-moi quelque chose de concret : qu'est-ce que tu as en tête maintenant ?",
    "J'ai besoin d'un peu plus pour t'aider. Qu'est-ce qui t'a fait ouvrir le chat aujourd'hui ?",
    "Commence par une phrase entière, même maladroite. Qu'est-ce qui te pèse le plus en ce moment ?",
    "Donne-moi un peu plus. Un mot ne suffit pas. Qu'est-ce que tu veux regarder aujourd'hui ?",
  ],
  de: [
    "Damit kann ich noch nicht viel anfangen. Erzähl mir etwas Konkretes: was geht dir gerade durch den Kopf?",
    "Ich brauche etwas mehr, um dir helfen zu können. Was hat dich heute hier hergebracht?",
    "Fang mit einem ganzen Satz an, auch wenn er holprig ist. Was wiegt gerade am schwersten?",
    "Gib mir noch etwas mehr. Ein Wort reicht nicht. Was möchtest du heute anschauen?",
  ],
};

/**
 * Devuelve una respuesta scripted para input ambiguo, eligiendo una
 * variante distinta a la última usada en este turno. El caller pasa
 * `lastUsedIdx` (típicamente la longitud del historial módulo N) para
 * garantizar rotación entre turnos.
 */
export function buildAmbiguousInputResponse(
  locale: "es" | "en" | "pt" | "fr" | "de" | string,
  turnIndex: number,
): string {
  const safeLocale = (["es", "en", "pt", "fr", "de"].includes(locale) ? locale : "es") as
    | "es"
    | "en"
    | "pt"
    | "fr"
    | "de";
  const variants = AMBIGUOUS_INPUT_PROMPTS[safeLocale];
  const idx = ((turnIndex % variants.length) + variants.length) % variants.length;
  return variants[idx];
}
