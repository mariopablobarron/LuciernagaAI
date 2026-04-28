import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";
import { buildInternalUserExclusion } from "@/lib/internal-users";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/usage-snapshot?secret=CRON_SECRET[&includeTeam=1]
 *
 * Returns aggregate usage metrics for "today" (UTC) and "yesterday" (UTC) so
 * an operator can quickly see how the day is going without admin session
 * auth. JSON only, no Telegram side-effects.
 *
 * Internal/test accounts are excluded by default (use ?includeTeam=1 to
 * include them).
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const includeTeam = req.nextUrl.searchParams.get("includeTeam") === "1";
  const prisma = getPrismaClient();

  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    ));
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const last7dStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userScope = await buildInternalUserExclusion({ excludeInternal: !includeTeam });
    const userWhere = userScope ? { id: userScope } : {};
    const userIdScoped = userScope ? { userId: userScope } : {};

    const [
      usersTotal,
      usersNewToday,
      usersNewYesterday,
      usersActiveToday,
      usersActiveYesterday,
      usersActive7d,
      conversationsToday,
      conversationsYesterday,
      messagesUserToday,
      messagesUserYesterday,
      messagesAssistantToday,
      crisisEventsToday,
      crisisEventsHigh7d,
      dailyLogsToday,
      systemLogErrorsToday,
      systemLogWarnsToday,
      llmCallsToday,
      llmCallsYesterday,
      llmCostTodayAgg,
      emailsSentToday,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, ...userWhere } }),
      prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: todayStart }, ...userWhere },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: yesterdayStart, lt: todayStart },
          ...userWhere,
        },
      }),
      prisma.user.count({
        where: { deletedAt: null, lastSeen: { gte: todayStart }, ...userWhere },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          lastSeen: { gte: yesterdayStart, lt: todayStart },
          ...userWhere,
        },
      }),
      prisma.user.count({
        where: { deletedAt: null, lastSeen: { gte: last7dStart }, ...userWhere },
      }),
      prisma.conversation.count({
        where: { createdAt: { gte: todayStart }, ...userIdScoped },
      }),
      prisma.conversation.count({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
          ...userIdScoped,
        },
      }),
      prisma.message.count({
        where: { createdAt: { gte: todayStart }, role: "user", ...userIdScoped },
      }),
      prisma.message.count({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
          role: "user",
          ...userIdScoped,
        },
      }),
      prisma.message.count({
        where: { createdAt: { gte: todayStart }, role: "assistant", ...userIdScoped },
      }),
      prisma.crisisEvent.count({
        where: { createdAt: { gte: todayStart }, ...userIdScoped },
      }),
      prisma.crisisEvent.count({
        where: {
          createdAt: { gte: last7dStart },
          level: { in: ["high", "critical"] },
          ...userIdScoped,
        },
      }),
      prisma.dailyLog.count({
        where: { createdAt: { gte: todayStart }, ...userIdScoped },
      }),
      prisma.systemLog.count({
        where: { timestamp: { gte: todayStart }, level: "error" },
      }),
      prisma.systemLog.count({
        where: { timestamp: { gte: todayStart }, level: "warn" },
      }),
      prisma.llmLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.llmLog.count({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      prisma.llmLog.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { totalTokens: true, costUsd: true },
      }),
      prisma.emailLog.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    // Top error tags today (most frequent SystemLog errors).
    const topErrorTags = await prisma.systemLog.groupBy({
      by: ["tag"],
      where: { timestamp: { gte: todayStart }, level: "error" },
      _count: { _all: true },
      orderBy: { _count: { tag: "desc" } },
      take: 5,
    });

    return NextResponse.json({
      ok: true,
      generatedAt: now.toISOString(),
      windowStartUtc: todayStart.toISOString(),
      includeTeam,
      users: {
        total: usersTotal,
        newToday: usersNewToday,
        newYesterday: usersNewYesterday,
        activeToday: usersActiveToday,
        activeYesterday: usersActiveYesterday,
        active7d: usersActive7d,
      },
      conversations: {
        today: conversationsToday,
        yesterday: conversationsYesterday,
      },
      messages: {
        userToday: messagesUserToday,
        userYesterday: messagesUserYesterday,
        assistantToday: messagesAssistantToday,
      },
      crisis: {
        eventsToday: crisisEventsToday,
        highOrCritical7d: crisisEventsHigh7d,
      },
      checkins: {
        dailyLogsToday,
      },
      llm: {
        callsToday: llmCallsToday,
        callsYesterday: llmCallsYesterday,
        totalTokensToday: llmCostTodayAgg._sum.totalTokens ?? 0,
        costUsdToday: llmCostTodayAgg._sum.costUsd ?? 0,
      },
      logs: {
        errorsToday: systemLogErrorsToday,
        warnsToday: systemLogWarnsToday,
        topErrorTags: topErrorTags.map((t) => ({ tag: t.tag, count: t._count._all })),
      },
      emails: {
        sentToday: emailsSentToday,
      },
    });
  } catch (error) {
    logError("USAGE_SNAPSHOT", error, { route: "/api/admin/usage-snapshot" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
