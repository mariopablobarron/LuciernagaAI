import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

// ─── Badge definitions (source of truth — not stored in DB) ─────────────────

export const BADGE_DEFINITIONS: Record<
  string,
  { label: string; desc: string; icon: string }
> = {
  first_project: {
    label: "Primer proyecto",
    desc: "Creaste tu primer proyecto personal",
    icon: "compass",
  },
  streak_7d: {
    label: "7 días seguidos",
    desc: "Mantuviste tu racha 7 días",
    icon: "flame",
  },
  streak_30d: {
    label: "Un mes sin parar",
    desc: "30 días de racha consecutiva",
    icon: "trophy",
  },
  phase_completed: {
    label: "Fase completada",
    desc: "Completaste una fase de tu proyecto",
    icon: "check-circle",
  },
  first_goal: {
    label: "Primer objetivo",
    desc: "Completaste tu primer objetivo",
    icon: "target",
  },
  active_30d: {
    label: "30 días activo",
    desc: "Llevas 30 días usando la plataforma",
    icon: "calendar",
  },
  invite_used: {
    label: "Latido compartido",
    desc: "Alguien usó tu invitación",
    icon: "heart",
  },
  diary_7d: {
    label: "Diario constante",
    desc: "7 días escribiendo en tu diario",
    icon: "book",
  },
  community_first: {
    label: "Primera reflexión",
    desc: "Compartiste tu primera reflexión",
    icon: "users",
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Awards a badge to a user. No-op if already earned.
 * Returns `true` when the badge is newly awarded, `false` if it already existed.
 */
export async function awardBadge(userId: string, badge: string): Promise<boolean> {
  if (!BADGE_DEFINITIONS[badge]) {
    logError("BADGES", new Error(`Unknown badge key: ${badge}`), { userId, badge });
    return false;
  }

  const prisma = getPrismaClient();

  try {
    // upsert to avoid race conditions — if already exists, do nothing
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badge: { userId, badge } },
    });

    if (existing) return false;

    await prisma.userBadge.create({
      data: { userId, badge },
    });

    logInfo("BADGES", "badge_awarded", { userId, badge });
    return true;
  } catch (err: unknown) {
    // Unique constraint violation means it was already awarded (race condition)
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique constraint")) return false;

    logError("BADGES", err, { action: "award_badge", userId, badge });
    return false;
  }
}

/**
 * Returns all badges a user has earned, enriched with definitions.
 */
export async function getUserBadges(userId: string) {
  const prisma = getPrismaClient();

  const earned = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });

  return earned.map((ub) => ({
    badge: ub.badge,
    earnedAt: ub.earnedAt,
    ...BADGE_DEFINITIONS[ub.badge],
  }));
}

/**
 * Returns all badge definitions with earned status for a given user.
 */
export async function getBadgeDefinitions(userId: string) {
  const prisma = getPrismaClient();

  const earned = await prisma.userBadge.findMany({
    where: { userId },
    select: { badge: true, earnedAt: true },
  });

  const earnedMap = new Map(earned.map((e) => [e.badge, e.earnedAt]));

  return Object.entries(BADGE_DEFINITIONS).map(([key, def]) => ({
    key,
    ...def,
    earned: earnedMap.has(key),
    earnedAt: earnedMap.get(key)?.toISOString() ?? null,
  }));
}
