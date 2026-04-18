/**
 * Content safety filter — shared by all user-generated content endpoints
 * (community posts, anonymous questions/answers, sync-session messages…).
 *
 * This is a coarse first-line filter: it blocks the most dangerous patterns
 * before they ever hit the DB. Fine-grained moderation (reports, hidden flag,
 * admin review) layers on top.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  /\b(matar|suicid|autolesion|violar?|viola\b|porn|nazi|terroris|bomb[ae])\b/i,
  /\b(me quiero morir|quiero matarme|hacerme da[nñ]o)\b/i,
  /\b(odio a|te voy a|voy a hacerte)\b/i,
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isContentSafe(text: string): boolean {
  if (!text) return true;
  const normalized = normalize(text);
  return !BLOCKED_PATTERNS.some((p) => p.test(normalized));
}

/**
 * Returns true when every non-empty field passes `isContentSafe`.
 * Convenience for endpoints that accept multiple optional text fields.
 */
export function areFieldsSafe(...fields: (string | null | undefined)[]): boolean {
  return fields.filter(Boolean).every((f) => isContentSafe(f as string));
}

/**
 * Returns true if the text contains patterns that suggest crisis / self-harm
 * (a subset of blocked patterns). Used to route questions to crisis handoff
 * instead of just rejecting them.
 */
export function looksLikeCrisis(text: string): boolean {
  if (!text) return false;
  const normalized = normalize(text);
  return (
    /\b(suicid|autolesion|me quiero morir|quiero matarme|hacerme da[nñ]o)\b/i.test(
      normalized,
    ) || /\b(matar|no aguanto|no puedo mas|acabar con todo)\b/i.test(normalized)
  );
}
