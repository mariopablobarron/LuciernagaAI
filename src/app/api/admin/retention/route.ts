import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { cache } from "@/lib/cache";
import { buildInternalUserExclusion, shouldExcludeInternal } from "@/lib/internal-users";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Day offsets to measure
const MILESTONES = [1, 3, 7, 14, 30] as const;

// Cohort retention is bounded by signup-week buckets — values shift slowly.
// 10 minutes is enough to absorb dashboard refresh storms without making the
// metric look stale to a CEO doing back-to-back checks.
const RETENTION_CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_KEY_PREFIX = "admin:retention:v1";

type Milestone = (typeof MILESTONES)[number];

type CohortRow = {
  week: string; // ISO date of Monday start
  totalUsers: number;
  retention: Record<Milestone, { count: number; rate: number | null }>;
};

type OverallRetention = Record<Milestone, number | null>;

type RetentionPayload = {
  cohorts: CohortRow[];
  overall: OverallRetention;
  totalUsers: number;
  milestones: typeof MILESTONES;
  meta: {
    excludeInternal: boolean;
    internalUserCount: number;
  };
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dayOffset(base: Date, days: number): { from: Date; to: Date } {
  const from = new Date(base.getTime() + (days - 1) * 86400_000);
  const to = new Date(base.getTime() + (days + 1) * 86400_000); // ±1 day window
  return { from, to };
}

async function computeRetention(excludeInternal: boolean): Promise<RetentionPayload> {
  const prisma = getPrismaClient();

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86400_000);
  const now = new Date();

  const userIdFilter = await buildInternalUserExclusion({ excludeInternal });

  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: twelveWeeksAgo },
      ...(userIdFilter ? { id: userIdFilter } : {}),
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    return {
      cohorts: [],
      overall: buildEmptyOverall(),
      totalUsers: 0,
      milestones: MILESTONES,
      meta: {
        excludeInternal,
        internalUserCount: userIdFilter?.notIn.length ?? 0,
      },
    };
  }

  const userIds = users.map((u) => u.id);

  const messages = await prisma.message.findMany({
    where: {
      userId: { in: userIds },
      role: "user", // only user messages = real activity
      createdAt: { gte: twelveWeeksAgo },
    },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 100000,
  });

  const activityMap = new Map<string, number[]>();
  for (const msg of messages) {
    if (!msg.userId) continue;
    const list = activityMap.get(msg.userId) ?? [];
    list.push(msg.createdAt.getTime());
    activityMap.set(msg.userId, list);
  }

  const cohortMap = new Map<string, typeof users>();
  for (const user of users) {
    const weekStart = startOfWeek(user.createdAt).toISOString().slice(0, 10);
    const list = cohortMap.get(weekStart) ?? [];
    list.push(user);
    cohortMap.set(weekStart, list);
  }

  const cohorts: CohortRow[] = [];
  const overallRetained: Record<Milestone, { retained: number; eligible: number }> = {
    1: { retained: 0, eligible: 0 },
    3: { retained: 0, eligible: 0 },
    7: { retained: 0, eligible: 0 },
    14: { retained: 0, eligible: 0 },
    30: { retained: 0, eligible: 0 },
  };

  for (const [week, cohortUsers] of cohortMap) {
    const retention = {} as CohortRow["retention"];

    for (const milestone of MILESTONES) {
      let retainedCount = 0;
      let eligible = 0;

      for (const user of cohortUsers) {
        const signupMs = user.createdAt.getTime();
        const { from, to } = dayOffset(user.createdAt, milestone);

        if (now.getTime() < from.getTime()) continue;
        eligible++;

        const userMsgs = activityMap.get(user.id) ?? [];
        const hasActivity = userMsgs.some(
          (ms) => ms >= from.getTime() && ms <= to.getTime() && ms > signupMs,
        );
        if (hasActivity) retainedCount++;
      }

      retention[milestone] = {
        count: retainedCount,
        rate: eligible > 0 ? retainedCount / eligible : null,
      };

      overallRetained[milestone].retained += retainedCount;
      overallRetained[milestone].eligible += eligible;
    }

    cohorts.push({ week, totalUsers: cohortUsers.length, retention });
  }

  cohorts.sort((a, b) => b.week.localeCompare(a.week));

  const overall: OverallRetention = {} as OverallRetention;
  for (const milestone of MILESTONES) {
    const { retained, eligible } = overallRetained[milestone];
    overall[milestone] = eligible > 0 ? retained / eligible : null;
  }

  return {
    cohorts,
    overall,
    totalUsers: users.length,
    milestones: MILESTONES,
    meta: {
      excludeInternal,
      internalUserCount: userIdFilter?.notIn.length ?? 0,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdminPermission(req, "retention");
    if (auth instanceof NextResponse) return auth;

    const excludeInternal = shouldExcludeInternal(req);
    const cacheKey = `${CACHE_KEY_PREFIX}:${excludeInternal ? "noTeam" : "all"}`;

    if (req.nextUrl.searchParams.get("refresh") === "1") {
      cache.invalidate(cacheKey);
    }

    const data = await cache.get<RetentionPayload>(
      cacheKey,
      RETENTION_CACHE_TTL_MS,
      () => computeRetention(excludeInternal),
    );

    return NextResponse.json(data);
  } catch (error) {
    logError("RETENTION", error, { action: "get_cohort_retention" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

function buildEmptyOverall(): OverallRetention {
  return { 1: null, 3: null, 7: null, 14: null, 30: null };
}
