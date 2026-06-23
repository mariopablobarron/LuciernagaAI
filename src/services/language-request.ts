/**
 * Detector de peticiones de cambio de idioma en el mensaje del usuario.
 *
 * Casos REALES observados en auditoría 2026-05-25 (convo cmpff1w5a...):
 *   user: "Em português" → mentor responde en español: "Respondo
 *   siempre en español..." → rechazo activo y usuario abandona.
 *
 * Política nueva: si el usuario pide explícitamente otro idioma soportado
 * (es/en/pt/fr), el mentor le hace caso desde ese turn. El cambio se
 * persiste en User.locale para que sobreviva la sesión.
 */

const PATTERNS: Array<{ regex: RegExp; locale: "es" | "en" | "pt" | "fr" }> = [
  // Pedir español
  { regex: /\b(en\s+espa(ñ|n)ol|háblame\s+en\s+espa(ñ|n)ol|responde\s+en\s+espa(ñ|n)ol)\b/i, locale: "es" },
  { regex: /\b(in\s+spanish|speak\s+spanish|reply\s+in\s+spanish)\b/i, locale: "es" },
  // Pedir inglés
  { regex: /\b(in\s+english|speak\s+english|reply\s+in\s+english)\b/i, locale: "en" },
  { regex: /\b(en\s+ingl(é|e)s|háblame\s+en\s+ingl(é|e)s|responde\s+en\s+ingl(é|e)s)\b/i, locale: "en" },
  { regex: /\b(em\s+ingl(ê|e)s|fala\s+em\s+ingl(ê|e)s)\b/i, locale: "en" },
  { regex: /\b(en\s+anglais|parle\s+en\s+anglais|r(é|e)ponds\s+en\s+anglais)\b/i, locale: "en" },
  // Pedir portugués
  { regex: /\b(em\s+portugu(ê|e)s|fala\s+(em\s+)?portugu(ê|e)s|responde\s+em\s+portugu(ê|e)s)\b/i, locale: "pt" },
  { regex: /\b(en\s+portugu(é|e)s|háblame\s+en\s+portugu(é|e)s)\b/i, locale: "pt" },
  { regex: /\b(in\s+portuguese|speak\s+portuguese)\b/i, locale: "pt" },
  // Pedir francés
  { regex: /\b(en\s+fran(ç|c)ais|parle\s+en\s+fran(ç|c)ais|r(é|e)ponds\s+en\s+fran(ç|c)ais)\b/i, locale: "fr" },
  { regex: /\b(en\s+franc(é|e)s|háblame\s+en\s+franc(é|e)s)\b/i, locale: "fr" },
  { regex: /\b(in\s+french|speak\s+french)\b/i, locale: "fr" },
  { regex: /\b(em\s+franc(ê|e)s|fala\s+em\s+franc(ê|e)s)\b/i, locale: "fr" },
];

export type LanguageRequest =
  | { changed: true; newLocale: "es" | "en" | "pt" | "fr" }
  | { changed: false };

/**
 * Detecta si el mensaje pide un cambio explícito de idioma.
 * Si el usuario pide el mismo idioma que ya está activo, devuelve
 * { changed: false } — no es un cambio real.
 */
export function detectLanguageRequest(
  message: string,
  currentLocale: string,
): LanguageRequest {
  if (!message || message.trim().length < 5) return { changed: false };
  for (const { regex, locale } of PATTERNS) {
    if (regex.test(message)) {
      if (locale === currentLocale) return { changed: false };
      return { changed: true, newLocale: locale };
    }
  }
  return { changed: false };
}

// ── Auto-detección por idioma del PROPIO mensaje ──────────────────────────
// Caso de uso: usuario en /es (UI español) escribe en inglés ("Hi, how are
// you today?") sin pedir cambio explícito. Antes el coach respondía siempre
// en español (recordatorio final del system prompt). Ahora detectamos el
// idioma del mensaje por stopwords + chars característicos y devolvemos un
// override LOCAL del locale — solo para esa request, sin tocar BD, cookie
// ni UI. Si el siguiente mensaje vuelve al idioma original, el coach se
// adapta también. Comportamiento estilo conversación natural multilingüe.
//
// Por qué stopwords y no franc/cld: 1) cero deps nuevas, 2) los 5 idiomas
// soportados son lo suficientemente distintos entre sí para que conteo de
// palabras función dé alta precisión, 3) franc-min añade ~50KB al bundle.

type SupportedLocale = "es" | "en" | "pt" | "fr" | "de";

const STOPWORDS: Record<SupportedLocale, ReadonlyArray<string>> = {
  // Lista corta de stopwords muy frecuentes + altamente distintivas. NO
  // incluir palabras que aparecen en varios idiomas a la vez (ej. "no" o "a"
  // existen en es/pt/en/it). Sí incluir contracciones inequívocas.
  es: [
    "el", "la", "los", "las", "un", "una", "de", "del", "que", "es", "está",
    "estoy", "soy", "tengo", "muy", "pero", "porque", "para", "cuando",
    "también", "sí", "qué", "cómo", "dónde", "cuándo", "esto", "eso", "esa",
    "este", "mi", "mis", "tu", "tus", "su", "sus", "hola", "gracias", "ahora",
  ],
  en: [
    "the", "and", "of", "to", "in", "is", "it", "that", "this", "with", "for",
    "you", "your", "i'm", "i've", "i'd", "i'll", "don't", "doesn't", "can't",
    "won't", "isn't", "aren't", "wasn't", "haven't", "what's", "how's",
    "hello", "thanks", "today", "tomorrow", "yesterday", "because", "about",
  ],
  pt: [
    "o", "a", "os", "as", "um", "uma", "de", "do", "da", "que", "é", "está",
    "estou", "sou", "tenho", "mas", "porque", "para", "quando", "também",
    "sim", "não", "olá", "obrigado", "obrigada", "você", "muito", "isto",
    "isso", "essa", "este", "meu", "minha", "seu", "sua", "agora",
  ],
  fr: [
    "le", "la", "les", "un", "une", "des", "de", "du", "que", "est", "suis",
    "j'ai", "c'est", "n'est", "qu'est", "qu'il", "mais", "parce", "pour",
    "quand", "aussi", "oui", "bonjour", "merci", "très", "ceci", "cela",
    "mon", "ma", "mes", "tes", "ses", "votre", "aujourd'hui",
  ],
  de: [
    "der", "die", "das", "den", "ein", "eine", "ich", "du", "sie", "wir",
    "ist", "sind", "habe", "haben", "nicht", "aber", "weil", "auch", "ja",
    "hallo", "danke", "sehr", "dies", "diese", "mein", "meine", "dein",
    "heute", "morgen", "gestern", "wenn", "als", "über", "ändern", "können",
  ],
};

// Marcadores diacríticos como tie-breaker cuando dos idiomas empatan en
// stopwords. NO usar solos — "está" puede ser es o pt; "été" puede ser fr.
const DIACRITIC_HINTS: Record<SupportedLocale, RegExp> = {
  es: /[¿¡ñÑ]/,
  en: /(?!)/, // sin hint específico (inglés sin diacríticos relevantes)
  pt: /[ãõÃÕ]|[çÇ](?=[aeiouAEIOU])/, // ã/õ son inequívocos pt
  fr: /[œŒ]|[àâèêëîïôûüù]/, // diacríticos amplios (algunos solapan con pt)
  de: /[äöüÄÖÜß]/,
};

// Saludos cortos inequívocos. Edge case observado 23-jun-2026: usuaria
// inglesa empieza con "hello", recibe "¿Qué llevas semanas evitando hacer?"
// en español (cookie locale=es por default). Resto de la conversación va en
// inglés porque la stopword detection ya tiene material, pero el primer
// turno queda raro. Estos saludos son tan distintivos que los detectamos
// instant sin esperar a tener >=5 palabras.
//
// Criterio: incluir solo lo INEQUÍVOCO en el idioma destino. "hi" se
// considera inglés porque en es/pt/fr/de los hablantes prácticamente no
// lo usan como saludo. "hallo" es alemán (también holandés pero no
// soportamos holandés). "bonjour" es francés inequívoco. "olá" portugués
// inequívoco. "hola" español inequívoco.
const GREETING_HINTS: Record<SupportedLocale, ReadonlyArray<string>> = {
  en: ["hi", "hello", "hey", "yo", "sup"],
  es: ["hola", "holi", "buenas", "qué tal", "que tal"],
  pt: ["olá", "ola", "oi"],
  fr: ["salut", "bonjour", "coucou", "bonsoir"],
  de: ["hallo", "servus", "moin", "tschüss"],
};

function detectGreeting(message: string): SupportedLocale | null {
  // Normalizamos: minúsculas, quitamos puntuación final, colapsamos espacios.
  const normalized = message
    .toLowerCase()
    .replace(/[!?.,;:¡¿]+$/g, "")
    .trim();
  // Solo activamos cuando el mensaje ENTERO es el saludo (no como prefijo
  // de una frase larga — esa la cubre stopword detection).
  if (normalized.length === 0 || normalized.length > 20) return null;
  for (const [loc, greetings] of Object.entries(GREETING_HINTS)) {
    if (greetings.includes(normalized)) {
      return loc as SupportedLocale;
    }
  }
  return null;
}

export type MessageLanguageDetection =
  | { detected: true; locale: SupportedLocale }
  | { detected: false };

/**
 * Detecta el idioma del mensaje del usuario por scoring de stopwords +
 * diacríticos. Devuelve `{ detected: true, locale }` SOLO si:
 *   - El mensaje tiene >= 5 palabras (mensajes cortos son ambiguos)
 *   - El idioma ganador tiene >= 2 matches de stopwords
 *   - El ganador tiene al menos 2x más matches que el segundo
 *   - El idioma detectado difiere de `currentLocale`
 *
 * Si NO se cumple, devuelve `{ detected: false }` y el caller mantiene
 * `currentLocale`. Diseñado para fail-safe: ante duda, NO cambia.
 */
export function detectMessageLanguage(
  message: string,
  currentLocale: string,
  allowedLocales: ReadonlyArray<SupportedLocale> = ["es", "en", "pt", "fr", "de"],
): MessageLanguageDetection {
  if (!message) return { detected: false };

  // Fast-path: saludo inequívoco (1-3 palabras) → detección instant sin
  // pasar por scoring de stopwords. Cubre "hello"/"hola"/"bonjour"/etc.
  const greetingLocale = detectGreeting(message);
  if (greetingLocale && allowedLocales.includes(greetingLocale) && greetingLocale !== currentLocale) {
    return { detected: true, locale: greetingLocale };
  }

  if (message.trim().length < 8) return { detected: false };

  // Tokenize en palabras, normalizado a minúsculas pero PRESERVANDO
  // diacríticos (los necesita el matcher). Punctuación fuera salvo ' que
  // forma parte de contracciones inglesas y francesas.
  const tokens = message
    .toLowerCase()
    .split(/[\s.,;:!?()[\]{}«»"–—…]+/)
    .filter((t) => t.length > 0);

  if (tokens.length < 5) return { detected: false };

  const scores: Partial<Record<SupportedLocale, number>> = {};
  for (const locale of allowedLocales) {
    let count = 0;
    const stopSet = new Set(STOPWORDS[locale]);
    for (const token of tokens) {
      if (stopSet.has(token)) count++;
    }
    // Bonus de 2 si hay diacríticos inequívocos. Multiplicador suave.
    if (DIACRITIC_HINTS[locale].test(message)) count += 2;
    scores[locale] = count;
  }

  // Ranking
  const ranked = Object.entries(scores)
    .map(([loc, score]) => ({ loc: loc as SupportedLocale, score: score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const runnerUp = ranked[1];

  if (!winner || winner.score < 2) return { detected: false };
  if (runnerUp && winner.score < runnerUp.score * 2) {
    // Empate o margen insuficiente: no cambiar.
    return { detected: false };
  }

  if (winner.loc === currentLocale) return { detected: false };

  return { detected: true, locale: winner.loc };
}
