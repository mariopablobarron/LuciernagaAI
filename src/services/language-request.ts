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
