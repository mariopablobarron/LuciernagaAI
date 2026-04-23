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

// ── Cooldown (in-memory, per CTA kind) ────────────────────────────────────
// Fail-open on process restart: if the server restarts, cooldowns reset and a
// user may see the CTA a second time. Acceptable for this iteration; move to
// DB-backed log before heavy rollout if CTR measurement becomes critical.
//
// Each kind has its own TTL because they serve different purposes:
//  - recurrent_blocker: weekly pattern → 7 days
//  - ask_community:     per-turn hint → 3 days (allow re-surface once the
//                       user cools off from the first dismissal)

export type CtaKind = "recurrent_blocker" | "ask_community";

const COOLDOWN_MS_BY_KIND: Record<CtaKind, number> = {
  recurrent_blocker: 7 * 24 * 60 * 60 * 1000,
  ask_community: 3 * 24 * 60 * 60 * 1000,
};

const lastShownByUserAndKind = new Map<string, number>();
const keyOf = (userId: string, kind: CtaKind) => `${kind}:${userId}`;

export function isCtaInCooldown(
  userId: string,
  kind: CtaKind = "recurrent_blocker",
  now: Date = new Date(),
): boolean {
  const last = lastShownByUserAndKind.get(keyOf(userId, kind));
  if (last === undefined) return false;
  if (now.getTime() - last >= COOLDOWN_MS_BY_KIND[kind]) {
    lastShownByUserAndKind.delete(keyOf(userId, kind));
    return false;
  }
  return true;
}

export function markCtaShown(
  userId: string,
  kind: CtaKind = "recurrent_blocker",
  now: Date = new Date(),
): void {
  lastShownByUserAndKind.set(keyOf(userId, kind), now.getTime());
}

export function resetCtaCooldownForTests(): void {
  lastShownByUserAndKind.clear();
}
