import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PeriodStats = {
  total: number;
  high: number;
  critical: number;
};

type CrisisStats = {
  totalAllTime: number;
  last24h: PeriodStats;
  last7d: PeriodStats;
  last30d: PeriodStats;
};

type ActiveCrisis = {
  userId: string;
  email: string;
  name: string | null;
  crisisActivatedAt: string | null;
  crisisActiveUntil: string | null;
};

type CrisisEventItem = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  level: string;
  message: string;
  response: string;
  createdAt: string;
};

type CrisisResponse = {
  stats: CrisisStats;
  activeCrises: ActiveCrisis[];
  events: CrisisEventItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  usersWithoutContact: number;
  familyNotified: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPeriodStats(
  groups: Array<{ level: string; _count: { _all: number } }>,
): PeriodStats {
  let total = 0;
  let high = 0;
  let critical = 0;
  for (const g of groups) {
    total += g._count._all;
    if (g.level === "high") high += g._count._all;
    if (g.level === "critical") critical += g._count._all;
  }
  return { total, high, critical };
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/crisis                                              */
/* ------------------------------------------------------------------ */

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 },
      );
      if (adminAuth.source === "invalid") clearAdminSessionCookie(unauthorized);
      return unauthorized;
    }

    const prisma = getPrismaClient();

    const { searchParams } = new URL(req.url);
    const page = clamp(parsePositiveInt(searchParams.get("page"), 1), 1, 10_000);
    const pageSize = clamp(parsePositiveInt(searchParams.get("pageSize"), 20), 1, 100);
    const levelFilter = searchParams.get("level")?.trim() || "";
    const fromParam = searchParams.get("from")?.trim() || "";
    const toParam = searchParams.get("to")?.trim() || "";

    /* ---------- Time boundaries ---------- */

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    /* ---------- Stats: counts per period ---------- */

    const [
      totalAllTime,
      last24hCounts,
      last7dCounts,
      last30dCounts,
    ] = await Promise.all([
      prisma.crisisEvent.count(),
      prisma.crisisEvent.groupBy({
        by: ["level"],
        where: { createdAt: { gte: twentyFourHoursAgo } },
        _count: { _all: true },
      }),
      prisma.crisisEvent.groupBy({
        by: ["level"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { _all: true },
      }),
      prisma.crisisEvent.groupBy({
        by: ["level"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
    ]);

    const stats: CrisisStats = {
      totalAllTime,
      last24h: toPeriodStats(last24hCounts),
      last7d: toPeriodStats(last7dCounts),
      last30d: toPeriodStats(last30dCounts),
    };

    /* ---------- Active crises ---------- */

    const activeStates = await prisma.userState.findMany({
      where: { crisisActive: true },
      select: {
        userId: true,
        crisisActivatedAt: true,
        crisisActiveUntil: true,
        user: { select: { email: true, name: true } },
      },
    });

    const activeCrises: ActiveCrisis[] = activeStates.map((s) => ({
      userId: s.userId,
      email: s.user.email,
      name: s.user.name,
      crisisActivatedAt: s.crisisActivatedAt?.toISOString() ?? null,
      crisisActiveUntil: s.crisisActiveUntil?.toISOString() ?? null,
    }));

    /* ---------- Paginated events ---------- */

    const eventsWhere: {
      level?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (levelFilter) {
      eventsWhere.level = levelFilter;
    }

    if (fromParam || toParam) {
      const createdAtFilter: { gte?: Date; lte?: Date } = {};
      if (fromParam) {
        const fromDate = new Date(fromParam);
        if (!Number.isNaN(fromDate.getTime())) createdAtFilter.gte = fromDate;
      }
      if (toParam) {
        const toDate = new Date(toParam);
        if (!Number.isNaN(toDate.getTime())) createdAtFilter.lte = toDate;
      }
      if (createdAtFilter.gte || createdAtFilter.lte) {
        eventsWhere.createdAt = createdAtFilter;
      }
    }

    const [eventsTotal, events] = await Promise.all([
      prisma.crisisEvent.count({ where: eventsWhere }),
      prisma.crisisEvent.findMany({
        where: eventsWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          level: true,
          message: true,
          response: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
        },
      }),
    ]);

    const totalPages = eventsTotal === 0 ? 0 : Math.ceil(eventsTotal / pageSize);

    const eventItems: CrisisEventItem[] = events.map((e) => ({
      id: e.id,
      userId: e.userId,
      email: e.user.email,
      name: e.user.name,
      level: e.level,
      message: e.message,
      response: e.response,
      createdAt: e.createdAt.toISOString(),
    }));

    /* ---------- Users without trusted contact ---------- */

    // Distinct user IDs that have had at least one crisis event
    const crisisUserIds = await prisma.crisisEvent.findMany({
      distinct: ["userId"],
      select: { userId: true },
    });

    const allCrisisUserIds = crisisUserIds.map((r) => r.userId);

    let usersWithoutContact = 0;
    if (allCrisisUserIds.length > 0) {
      // Users who DO have a trusted contact with notifyOnCrisis=true
      const usersWithNotify = await prisma.trustedContact.findMany({
        where: {
          userId: { in: allCrisisUserIds },
          notifyOnCrisis: true,
        },
        select: { userId: true },
      });
      const notifyUserIds = new Set(usersWithNotify.map((c) => c.userId));
      usersWithoutContact = allCrisisUserIds.filter((id) => !notifyUserIds.has(id)).length;
    }

    /* ---------- Family notified (approximate) ---------- */

    // Count of crisis events where the user has a TrustedContact with notifyOnCrisis=true
    const familyNotified = await prisma.crisisEvent.count({
      where: {
        user: {
          trustedContact: {
            notifyOnCrisis: true,
          },
        },
      },
    });

    /* ---------- Response ---------- */

    const body: CrisisResponse = {
      stats,
      activeCrises,
      events: eventItems,
      pagination: {
        page,
        pageSize,
        total: eventsTotal,
        totalPages,
      },
      usersWithoutContact,
      familyNotified,
    };

    return NextResponse.json(body);
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/crisis" });
    return NextResponse.json(
      { error: "ADMIN_CRISIS_FAILED", message: "No se pudo cargar los datos de crisis." },
      { status: 500 },
    );
  }
}, { limit: 30 });
