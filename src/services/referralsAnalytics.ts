import { getPrismaClient } from "@/db/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReferralLeaderboardRow = {
  userId: string;
  name: string | null;
  email: string;
  invitesCreated: number;
  invitesUsed: number;
  invitesEarned: number; // from User.invitesEarned
  conversionRate: number; // used / created (0..1)
};

export type ReferralReasonRow = {
  reason: string;
  generated: number;
  used: number;
  conversionRate: number; // 0..1
};

export type ReferralRetention = {
  /** % (0..100, one decimal) of referred users retained N days after signup */
  referred: number;
  nonReferred: number;
  referredCohort: number;
  nonReferredCohort: number;
};

export type ReferralTimelinePoint = {
  date: string; // YYYY-MM-DD
  generated: number;
  used: number;
};

export type ReferralSummary = {
  // Legacy fields — kept for backward compatibility with any callers.
  totalInvitationsCreated: number;
  totalInvitationsUsed: number;
  uniqueInviters: number;
  overallConversionRate: number;
  topInviters: ReferralLeaderboardRow[];

  // New analytics fields.
  pending: number;
  generated7d: number;
  used7d: number;
  generated30d: number;
  used30d: number;
  byReason: ReferralReasonRow[];
  retention: {
    d7: ReferralRetention;
    d30: ReferralRetention;
  };
  dailyTimeline: ReferralTimelinePoint[];
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pct1(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 10;
}

/**
 * Aggregates invitation data into a referral-program dashboard:
 * - totals (generated / used / pending) with 7d + 30d breakdowns
 * - top inviters with per-user conversion
 * - distribution by earn reason (streak_7d, goal_complete, …)
 * - D7 / D30 retention comparing referred vs non-referred cohorts
 * - 30-day daily timeline of generated and used invites
 */
export async function getReferralSummary(limit = 20): Promise<ReferralSummary> {
  const prisma = getPrismaClient();
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);

  // Retention cohorts — only users mature enough for the window to mean something.
  const d7Start = new Date(now.getTime() - 60 * DAY_MS);
  const d7End = new Date(now.getTime() - 7 * DAY_MS);
  const d30Start = new Date(now.getTime() - 90 * DAY_MS);
  const d30End = new Date(now.getTime() - 30 * DAY_MS);

  const [
    totalCreated,
    totalUsed,
    generated7d,
    used7d,
    generated30d,
    used30d,
    generatedByUser,
    usedByUser,
    generatedByReason,
    usedByReason,
    timelineRows,
    d7Cohort,
    d30Cohort,
  ] = await Promise.all([
    prisma.invitation.count(),
    prisma.invitation.count({ where: { usedByUserId: { not: null } } }),
    prisma.invitation.count({ where: { createdAt: { gte: since7d } } }),
    prisma.invitation.count({
      where: { usedAt: { gte: since7d }, usedByUserId: { not: null } },
    }),
    prisma.invitation.count({ where: { createdAt: { gte: since30d } } }),
    prisma.invitation.count({
      where: { usedAt: { gte: since30d }, usedByUserId: { not: null } },
    }),
    prisma.invitation.groupBy({
      by: ["userId"],
      _count: { _all: true },
    }),
    prisma.invitation.groupBy({
      by: ["userId"],
      where: { usedByUserId: { not: null } },
      _count: { _all: true },
    }),
    prisma.invitation.groupBy({
      by: ["reason"],
      _count: { _all: true },
    }),
    prisma.invitation.groupBy({
      by: ["reason"],
      where: { usedByUserId: { not: null } },
      _count: { _all: true },
    }),
    prisma.invitation.findMany({
      where: { createdAt: { gte: since30d } },
      select: { createdAt: true, usedAt: true, usedByUserId: true },
      take: 50000,
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: d7Start, lte: d7End }, deletedAt: null },
      select: { id: true, createdAt: true, lastSeen: true },
      take: 10000,
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: d30Start, lte: d30End }, deletedAt: null },
      select: { id: true, createdAt: true, lastSeen: true },
      take: 10000,
    }),
  ]);

  const uniqueInviters = generatedByUser.length;

  // Leaderboard — enrich with user details.
  const usedByUserMap = new Map<string, number>();
  for (const g of usedByUser) usedByUserMap.set(g.userId, g._count._all);

  const inviterIds = generatedByUser.map((g) => g.userId);
  const inviterUsers =
    inviterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true, email: true, invitesEarned: true },
        })
      : [];
  const userById = new Map(inviterUsers.map((u) => [u.id, u]));

  const topInviters: ReferralLeaderboardRow[] = generatedByUser
    .map((g) => {
      const user = userById.get(g.userId);
      const created = g._count._all;
      const used = usedByUserMap.get(g.userId) ?? 0;
      return {
        userId: g.userId,
        name: user?.name ?? null,
        email: user?.email ?? "(desconocido)",
        invitesCreated: created,
        invitesUsed: used,
        invitesEarned: user?.invitesEarned ?? 0,
        conversionRate: created > 0 ? used / created : 0,
      };
    })
    .sort((a, b) => b.invitesUsed - a.invitesUsed || b.invitesCreated - a.invitesCreated)
    .slice(0, limit);

  // Distribution by earn reason.
  const usedByReasonMap = new Map<string, number>();
  for (const r of usedByReason) usedByReasonMap.set(r.reason ?? "unknown", r._count._all);
  const byReason: ReferralReasonRow[] = generatedByReason
    .map((r) => {
      const reasonKey = r.reason ?? "unknown";
      const generated = r._count._all;
      const used = usedByReasonMap.get(reasonKey) ?? 0;
      return {
        reason: reasonKey,
        generated,
        used,
        conversionRate: generated > 0 ? used / generated : 0,
      };
    })
    .sort((a, b) => b.generated - a.generated);

  // Retention — compare referred vs non-referred cohorts.
  async function retention(
    cohort: Array<{ id: string; createdAt: Date; lastSeen: Date }>,
    windowDays: number,
  ): Promise<ReferralRetention> {
    if (cohort.length === 0) {
      return { referred: 0, nonReferred: 0, referredCohort: 0, nonReferredCohort: 0 };
    }
    const ids = cohort.map((u) => u.id);
    const referredRows = await prisma.invitation.findMany({
      where: { usedByUserId: { in: ids } },
      select: { usedByUserId: true },
    });
    const referredSet = new Set(referredRows.map((r) => r.usedByUserId as string));

    let refCohort = 0;
    let refRet = 0;
    let nonRefCohort = 0;
    let nonRefRet = 0;
    for (const u of cohort) {
      const retained =
        u.lastSeen.getTime() >= u.createdAt.getTime() + windowDays * DAY_MS;
      if (referredSet.has(u.id)) {
        refCohort++;
        if (retained) refRet++;
      } else {
        nonRefCohort++;
        if (retained) nonRefRet++;
      }
    }
    return {
      referred: pct1(refRet, refCohort),
      nonReferred: pct1(nonRefRet, nonRefCohort),
      referredCohort: refCohort,
      nonReferredCohort: nonRefCohort,
    };
  }

  const [d7Retention, d30Retention] = await Promise.all([
    retention(d7Cohort, 7),
    retention(d30Cohort, 30),
  ]);

  // Daily timeline — last 30 days, aligned to today.
  const generatedByDay = new Map<string, number>();
  const usedByDay = new Map<string, number>();
  for (const inv of timelineRows) {
    const gKey = dayKey(inv.createdAt);
    generatedByDay.set(gKey, (generatedByDay.get(gKey) ?? 0) + 1);
    if (inv.usedAt && inv.usedByUserId) {
      const uKey = dayKey(inv.usedAt);
      usedByDay.set(uKey, (usedByDay.get(uKey) ?? 0) + 1);
    }
  }
  const dailyTimeline: ReferralTimelinePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = dayKey(new Date(now.getTime() - i * DAY_MS));
    dailyTimeline.push({
      date: day,
      generated: generatedByDay.get(day) ?? 0,
      used: usedByDay.get(day) ?? 0,
    });
  }

  return {
    totalInvitationsCreated: totalCreated,
    totalInvitationsUsed: totalUsed,
    uniqueInviters,
    overallConversionRate: totalCreated > 0 ? totalUsed / totalCreated : 0,
    topInviters,
    pending: totalCreated - totalUsed,
    generated7d,
    used7d,
    generated30d,
    used30d,
    byReason,
    retention: { d7: d7Retention, d30: d30Retention },
    dailyTimeline,
  };
}
