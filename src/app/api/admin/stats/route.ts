import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats?from=2026-01-01&to=2026-04-11
 *
 * Unified analytics endpoint with configurable date range.
 * Returns KPIs, user activity, emotional states, crisis, goals,
 * LLM usage, and funnel data — all filtered by the provided range.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const now = new Date();
  const to = toParam ? new Date(toParam + "T23:59:59.999Z") : now;
  const from = fromParam ? new Date(fromParam + "T00:00:00.000Z") : new Date(now.getTime() - 30 * 86400000);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const prisma = getPrismaClient();

  try {
    // Previous period (same duration, ending where this one starts)
    const durationMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - durationMs);
    const prevTo = from;

    const [
      totalUsers,
      signups,
      prevSignups,
      messages,
      prevMessages,
      conversations,
      checkins,
      prevCheckins,
      crisisEvents,
      goalsCreated,
      goalsCompleted,
      actionsCompleted,
      actionsTotal,
      llmLogs,
      stateDistribution,
      activeUsersInRange,
    ] = await Promise.all([
      // Total users (all time)
      prisma.user.count({ where: { passwordHash: { not: null } } }),

      // Signups in range
      prisma.user.count({ where: { createdAt: { gte: from, lte: to }, passwordHash: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gte: prevFrom, lte: prevTo }, passwordHash: { not: null } } }),

      // Messages in range
      prisma.message.count({ where: { createdAt: { gte: from, lte: to }, role: "user" } }),
      prisma.message.count({ where: { createdAt: { gte: prevFrom, lte: prevTo }, role: "user" } }),

      // Conversations in range
      prisma.conversation.count({ where: { createdAt: { gte: from, lte: to } } }),

      // Checkins in range
      prisma.dailyCheckin.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.dailyCheckin.count({ where: { createdAt: { gte: prevFrom, lte: prevTo } } }),

      // Crisis events in range
      prisma.crisisEvent.count({ where: { createdAt: { gte: from, lte: to } } }),

      // Goals
      prisma.goal.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.goal.count({ where: { status: "completed", updatedAt: { gte: from, lte: to } } }),

      // Actions
      prisma.action.count({ where: { completed: true, createdAt: { gte: from, lte: to } } }),
      prisma.action.count({ where: { createdAt: { gte: from, lte: to } } }),

      // LLM usage in range
      prisma.llmLog.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
        _sum: { totalTokens: true, costUsd: true },
        _avg: { latencyMs: true },
      }),

      // State distribution (current snapshot)
      prisma.userState.groupBy({
        by: ["state"],
        _count: true,
      }),

      // Active users in range (had at least one message)
      prisma.message.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: from, lte: to }, role: "user", userId: { not: null } },
      }).then((groups) => groups.length),
    ]);

    // Emotional distribution (current snapshot)
    const emotionDist = await prisma.userState.groupBy({
      by: ["primaryEmotion"],
      _count: true,
    });

    // Daily activity breakdown within range
    const dailyMessages = await prisma.message.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: from, lte: to }, role: "user" },
      _count: true,
    });

    // Aggregate daily data by date
    const dailyMap = new Map<string, number>();
    for (const row of dailyMessages) {
      const day = row.createdAt.toISOString().split("T")[0];
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + row._count);
    }
    const dailyActivity = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, messages: count }));

    // Funnel (all time, not range-filtered)
    const [funnelRegistered, funnelFirstConv, funnelFirstGoal, funnelFirstAction] = await Promise.all([
      prisma.user.count({ where: { passwordHash: { not: null } } }),
      prisma.user.count({ where: { passwordHash: { not: null }, conversations: { some: {} } } }),
      prisma.user.count({ where: { passwordHash: { not: null }, goals: { some: {} } } }),
      prisma.user.count({ where: { passwordHash: { not: null }, goals: { some: { actions: { some: { completed: true } } } } } }),
    ]);

    const states: Record<string, number> = {};
    for (const s of stateDistribution) {
      states[s.state] = s._count;
    }

    const emotions: Record<string, number> = {};
    for (const e of emotionDist) {
      emotions[e.primaryEmotion] = e._count;
    }

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        totalUsers,
        signups: { value: signups, prev: prevSignups, delta: signups - prevSignups },
        messages: { value: messages, prev: prevMessages, delta: messages - prevMessages },
        checkins: { value: checkins, prev: prevCheckins, delta: checkins - prevCheckins },
        conversations,
        crisisEvents,
        activeUsers: activeUsersInRange,
        goalsCreated,
        goalsCompleted,
        actionsCompleted,
        actionsTotal,
        actionCompletionRate: actionsTotal > 0 ? Math.round((actionsCompleted / actionsTotal) * 100) : 0,
      },
      llm: {
        requests: llmLogs._count,
        totalTokens: llmLogs._sum.totalTokens ?? 0,
        costUsd: llmLogs._sum.costUsd ?? 0,
        avgLatencyMs: Math.round(llmLogs._avg.latencyMs ?? 0),
      },
      states,
      emotions,
      dailyActivity,
      funnel: [
        { label: "Registrados", count: funnelRegistered },
        { label: "Primera conversación", count: funnelFirstConv },
        { label: "Primer objetivo", count: funnelFirstGoal },
        { label: "Primera acción completada", count: funnelFirstAction },
      ],
    });
  } catch (error) {
    logError("ADMIN", error, { action: "unified_stats", from: fromParam, to: toParam });
    return NextResponse.json({ error: "STATS_FAILED" }, { status: 500 });
  }
}
