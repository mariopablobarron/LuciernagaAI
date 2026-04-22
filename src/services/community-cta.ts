import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { detectRecurrentState } from "@/services/blocker-recurrence";
import {
  getCommunityCtaForState,
  isCtaInCooldown,
  markCtaShown,
  type CommunityCtaTarget,
} from "@/services/community-cta-map";
import type { UserState } from "@/domain/types";

export type CommunityCtaAction = {
  kind: "recurrent_blocker";
  state: UserState;
  daysHit: number;
  spaceSlug: string;
  href: string;
  label: string;
  reason: string;
};

export type CommunityCtaOptions = {
  now?: Date;
};

/**
 * Decide whether to surface a Community CTA for this turn.
 * Fails closed on any error or missing data.
 *
 * Returns null when:
 * - crisis mode active (caller must pass crisisMode=true to suppress)
 * - no recurrent state signal
 * - mapping for detected state is not configured
 * - target CommunitySpace does not exist or is inactive
 * - user was shown any CTA within the cooldown window (7 days)
 *
 * On success, marks the cooldown for the user.
 */
export async function resolveCommunityCta(params: {
  userId: string;
  crisisMode: boolean;
  options?: CommunityCtaOptions;
}): Promise<CommunityCtaAction | null> {
  const { userId, crisisMode } = params;
  const now = params.options?.now ?? new Date();

  if (crisisMode) return null;
  if (isCtaInCooldown(userId, now)) return null;

  try {
    const signal = await detectRecurrentState(userId, { now });
    if (!signal.isRecurrent) return null;

    const target: CommunityCtaTarget | null = getCommunityCtaForState(signal.state);
    if (!target) return null;

    const prisma = getPrismaClient();
    const space = await prisma.communitySpace.findUnique({
      where: { slug: target.spaceSlug },
      select: { slug: true, isActive: true },
    });
    if (!space || !space.isActive) return null;

    markCtaShown(userId, now);

    return {
      kind: "recurrent_blocker",
      state: signal.state,
      daysHit: signal.daysHit,
      spaceSlug: space.slug,
      href: `/community?space=${encodeURIComponent(space.slug)}`,
      label: target.label,
      reason: target.reason,
    };
  } catch (error) {
    logError("COMMUNITY_CTA", error, { userId, stage: "resolveCommunityCta" });
    return null;
  }
}
