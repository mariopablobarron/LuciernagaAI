import type { UserState } from "@/domain/types";

export type CommunityCtaTarget = {
  spaceSlug: string;
  label: string;
  reason: string;
};

// Mapping from emotional state to a Community Space invitation.
// Slugs must match `CommunitySpace.slug` in DB. Update when Space slugs change.
const STATE_TO_CTA: Partial<Record<UserState, CommunityCtaTarget>> = {
  bloqueo: {
    spaceSlug: "bloqueos",
    label: "Entrar al espacio de bloqueos",
    reason: "Este patrón lo están trabajando otras personas en comunidad.",
  },
  ansiedad: {
    spaceSlug: "ansiedad",
    label: "Entrar al espacio de ansiedad",
    reason: "Hay gente en tu misma fase hablando de esto ahora.",
  },
};

export function getCommunityCtaForState(state: UserState): CommunityCtaTarget | null {
  return STATE_TO_CTA[state] ?? null;
}

// ── Cooldown (in-memory, 7 days) ──────────────────────────────────────────
// Fail-open on process restart: if the server restarts, cooldowns reset and a
// user may see the CTA a second time. Acceptable for this iteration; move to
// DB-backed log before heavy rollout if CTR measurement becomes critical.

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const lastShownByUser = new Map<string, number>();

export function isCtaInCooldown(userId: string, now: Date = new Date()): boolean {
  const last = lastShownByUser.get(userId);
  if (last === undefined) return false;
  if (now.getTime() - last >= COOLDOWN_MS) {
    lastShownByUser.delete(userId);
    return false;
  }
  return true;
}

export function markCtaShown(userId: string, now: Date = new Date()): void {
  lastShownByUser.set(userId, now.getTime());
}

export function resetCtaCooldownForTests(): void {
  lastShownByUser.clear();
}
