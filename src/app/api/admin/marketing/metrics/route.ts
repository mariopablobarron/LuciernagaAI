import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = resolveAdminAuth(req);
  if (!adminAuth.authenticated) {
    const res = NextResponse.json(
      { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
      { status: 401 },
    );
    if (adminAuth.source === "invalid") clearAdminSessionCookie(res);
    return res;
  }

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      signupsLast7d,
      signupsLast30d,
      quizCompletionsLast7d,
      waitlistLast7d,
      proUsers,
      activeUsersLast7d,
      recentSignups,
    ] = await Promise.all([
      // Users created in last 7 days
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),

      // Users created in last 30 days
      prisma.user.count({ where: { createdAt: { gte: since30d } } }),

      // QuizResult records in last 7 days
      prisma.quizResult.count({ where: { createdAt: { gte: since7d } } }),

      // WaitlistEntry records in last 7 days
      prisma.waitlistEntry.count({ where: { createdAt: { gte: since7d } } }),

      // Active subscriptions with plan "pro"
      prisma.subscription.count({
        where: { plan: "pro", status: "active" },
      }),

      // Users with lastSeen >= 7 days ago
      prisma.user.count({ where: { lastSeen: { gte: since7d } } }),

      // Raw signups for daily bucketing (last 30 days)
      prisma.user.findMany({
        where: { createdAt: { gte: since30d } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50000,
      }),
    ]);

    // Build dailySignups array (last 30 days bucketed by day)
    const signupsByDay = new Map<string, number>();
    for (const u of recentSignups) {
      const key = dayKey(u.createdAt);
      signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
    }

    const dailySignups: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const day = dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      dailySignups.push({ date: day, count: signupsByDay.get(day) ?? 0 });
    }

    // Funnel counts (parallel)
    const [quizTotal, waitlistTotal, signupTotal] = await Promise.all([
      prisma.quizResult.count(),
      prisma.waitlistEntry.count(),
      prisma.user.count(),
    ]);

    const funnel = {
      quiz: quizTotal,
      waitlist: waitlistTotal,
      signup: signupTotal,
      pro: proUsers,
    };

    return NextResponse.json({
      signupsLast7d,
      signupsLast30d,
      quizCompletionsLast7d,
      waitlistLast7d,
      proUsers,
      activeUsersLast7d,
      dailySignups,
      funnel,
    });
  } catch (error: unknown) {
    logError("MARKETING_METRICS", error, { route: "/api/admin/marketing/metrics" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch marketing metrics." },
      { status: 500 },
    );
  }
}, { limit: 30 });
