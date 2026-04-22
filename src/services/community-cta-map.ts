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
