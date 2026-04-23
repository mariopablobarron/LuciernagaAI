import { isCtaInCooldown, markCtaShown } from "@/services/community-cta-map";

export type AskCommunityCtaAction = {
  kind: "ask_community";
  href: string;
  label: string;
  reason: string;
  suggestedQuestion: string;
};

const MIN_LENGTH = 25;
const MAX_LENGTH = 500;

// Patterns that strongly suggest the user is stuck on a question they
// would benefit from hearing other humans' experience on. Conservative:
// we prefer false negatives (not suggesting) over false positives
// (interrupting a flow that wasn't really a question).
// Accented Spanish letters aren't \w in non-unicode regex, so \b around them
// fails to match. Use space/punctuation boundaries explicitly.
const QUESTION_PATTERNS: RegExp[] = [
  /\?\s*$/, // ends in question mark
  /(^|\s)(no s[eé]|no tengo claro|no entiendo|no me sale)(\s|$|[.,!?])/i,
  /(^|\s)(c[oó]mo|qu[eé] hago|qu[eé] hacer|y si |alguien (sabe|ha pasado)|alguna vez)(\s|$|[.,!?])/i,
];

// Patterns that indicate the message is NOT a good candidate — it is a
// statement, a completion report, a celebration or anything that isn't
// a question directed at the mentor that the community could answer.
const EXCLUDE_PATTERNS: RegExp[] = [
  /\b(lo hice|ya est[áa]|terminado|listo|completado|hecho)\b/i,
  /\b(gracias|genial|perfecto|vale|ok|de acuerdo)$/i,
];

export function isAskCommunityCandidate(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < MIN_LENGTH) return false;
  if (trimmed.length > MAX_LENGTH) return false;
  if (EXCLUDE_PATTERNS.some((re) => re.test(trimmed))) return false;
  return QUESTION_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * Decide whether to offer the "llevar esto a la comunidad" CTA.
 * Fails closed: does not surface while in crisis or within the cooldown
 * window, and never for messages that don't look like a reusable question.
 */
export function resolveAskCommunityCta(params: {
  userId: string;
  message: string;
  crisisMode: boolean;
  now?: Date;
}): AskCommunityCtaAction | null {
  const { userId, message, crisisMode } = params;
  const now = params.now ?? new Date();

  if (crisisMode) return null;
  if (!isAskCommunityCandidate(message)) return null;
  if (isCtaInCooldown(userId, "ask_community", now)) return null;

  markCtaShown(userId, "ask_community", now);

  const prefill = message.trim().slice(0, MAX_LENGTH);
  return {
    kind: "ask_community",
    href: `/community?tab=questions&prefill=${encodeURIComponent(prefill)}`,
    label: "Llevarlo a la comunidad",
    reason:
      "Puede que alguien haya pasado por esto. Publica tu duda (anónima) y otra persona responde desde su experiencia.",
    suggestedQuestion: prefill,
  };
}
