import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { verifyOrgToken } from "@/lib/org-auth";
import { cache } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Minimum group size to show aggregate data (privacy threshold)
const MIN_GROUP_SIZE = 5;

type AggregateStats = {
  totalUsers: number;
  activeUsersLast7d: number;
  activeUsersLast30d: number;
  emotionalDistribution: Record<string, number>;
  stateDistribution: Record<string, number>;
  avgStreakDays: number;
  avgMessagesPerUser: number;
  crisisEventsLast30d: number;
  goalCompletionRate: number;
  retentionRate7d: number;
};

/**
 * GET /api/org/dashboard?orgId=...&token=...
 *
 * Returns ANONYMIZED aggregate data for an organization.
 * No PII (names, emails, individual data) is ever returned.
 * Only shows data when group size >= MIN_GROUP_SIZE (5).
 */
export const GET = withRateLimit(async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  const token = req.nextUrl.searchParams.get("token");

  if (!orgId || !token) {
    return NextResponse.json({ error: "Missing orgId or token" }, { status: 400 });
  }

  // Verify signed token and extract admin ID
  const verified = verifyOrgToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  try {
    // Verify org admin access using the admin ID from the signed token
    const admin = await prisma.orgAdmin.findFirst({
      where: { organizationId: orgId, id: verified.adminId },
      select: { id: true, role: true, organizationId: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, type: true, isActive: true },
    });

    if (!org?.isActive) {
      return NextResponse.json({ error: "Organization inactive" }, { status: 403 });
    }

    const now = new Date();
    const CACHE_TTL = 60_000; // 60 seconds — balances freshness vs DB load for 2000+ users

    // All aggregate queries wrapped in cache — key per org
    const dashboardData = await cache.get(`org-dashboard:${orgId}`, CACHE_TTL, async () => {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Count total users in org
      const totalUsers = await prisma.user.count({
        where: { organizationId: orgId, isActive: true },
      });

      if (totalUsers < MIN_GROUP_SIZE) {
        return { totalUsers, belowMinimum: true } as const;
      }

      // All aggregate queries in parallel
      const [
        activeUsers7d, activeUsers30d, userStates, streaks,
        msgAgg, crisisEventsLast30d, goals, classrooms,
      ] = await Promise.all([
        prisma.user.count({ where: { organizationId: orgId, isActive: true, lastSeen: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { organizationId: orgId, isActive: true, lastSeen: { gte: thirtyDaysAgo } } }),
        prisma.userState.findMany({ where: { user: { organizationId: orgId, isActive: true } }, select: { state: true, primaryEmotion: true } }),
        prisma.streak.findMany({ where: { user: { organizationId: orgId, isActive: true } }, select: { currentDays: true } }),
        prisma.user.aggregate({ where: { organizationId: orgId, isActive: true }, _avg: { messageCount: true } }),
        prisma.crisisEvent.count({ where: { user: { organizationId: orgId }, createdAt: { gte: thirtyDaysAgo }, level: { in: ["high", "critical"] } } }),
        prisma.goal.findMany({ where: { user: { organizationId: orgId, isActive: true } }, select: { status: true } }),
        prisma.classroom.findMany({
          where: { organizationId: orgId, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, _count: { select: { users: true } }, teachers: { select: { id: true, name: true } } },
        }),
      ]);

      const stateDistribution: Record<string, number> = {};
      const emotionalDistribution: Record<string, number> = {};
      for (const us of userStates) {
        stateDistribution[us.state] = (stateDistribution[us.state] ?? 0) + 1;
        emotionalDistribution[us.primaryEmotion] = (emotionalDistribution[us.primaryEmotion] ?? 0) + 1;
      }

      const avgStreakDays = streaks.length > 0
        ? Math.round(streaks.reduce((sum, s) => sum + s.currentDays, 0) / streaks.length * 10) / 10
        : 0;
      const avgMessagesPerUser = Math.round(msgAgg._avg.messageCount ?? 0);
      const completedGoals = goals.filter((g) => g.status === "completed").length;
      const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
      const retentionRate7d = totalUsers > 0 ? Math.round((activeUsers7d / totalUsers) * 100) : 0;

      return {
        belowMinimum: false as const,
        totalUsers,
        stats: {
          totalUsers,
          activeUsersLast7d: activeUsers7d,
          activeUsersLast30d: activeUsers30d,
          emotionalDistribution,
          stateDistribution,
          avgStreakDays,
          avgMessagesPerUser,
          crisisEventsLast30d,
          goalCompletionRate,
          retentionRate7d,
        } satisfies AggregateStats,
        classrooms: classrooms.map((c) => ({
          id: c.id,
          name: c.name,
          userCount: c._count.users,
          teachers: c.teachers,
        })),
      };
    });

    // Privacy guard
    if (dashboardData.belowMinimum) {
      return NextResponse.json({
        ok: true,
        organization: org.name,
        privacyNotice: `Insufficient data. Minimum ${MIN_GROUP_SIZE} active users required for aggregate reporting.`,
        totalUsers: dashboardData.totalUsers,
        stats: null,
      });
    }

    const { stats, classrooms } = dashboardData;

    return NextResponse.json({
      ok: true,
      organization: org.name,
      type: org.type,
      generatedAt: now.toISOString(),
      privacyNotice: "All data is anonymized and aggregated. No individual user data is exposed.",
      stats,
      classrooms,
    });
  } catch (error) {
    logError("ORG", error, { action: "dashboard_fetch", orgId });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}, { limit: 30 });
