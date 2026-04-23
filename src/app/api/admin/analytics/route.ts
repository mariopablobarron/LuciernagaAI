import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { buildInternalUserExclusion, shouldExcludeInternal } from "@/lib/internal-users";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "analytics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const prisma = getPrismaClient();
  const now = new Date();
  const daysBack = 30;
  const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Exclude team/test accounts by default. Admin can opt-in with ?includeTeam=1.
  const excludeInternal = shouldExcludeInternal(req);
  const userIdFilter = await buildInternalUserExclusion({ excludeInternal });
  const userWhereFilter = userIdFilter ? { id: userIdFilter } : {};
  const userIdScoped = userIdFilter ? { userId: userIdFilter } : {};

  // ── Parallel queries ──
  const [
    totalUsers,
    usersThisWeek,
    usersPrevWeek,
    messagesThisWeek,
    messagesPrevWeek,
    checkinsThisWeek,
    checkinsPrevWeek,
    recentUsers,
    recentMessages,
    recentCheckins,
    conversationsThisWeek,
    conversationsPrevWeek,
    stateDistribution,
    subscriptionStats,
    goalsActive,
    goalsCompleted,
    goalsAbandoned,
    actionsTotal,
    actionsCompleted,
  ] = await Promise.all([
    prisma.user.count({ where: userWhereFilter }),
    prisma.user.count({ where: { ...userWhereFilter, createdAt: { gte: since7d } } }),
    prisma.user.count({ where: { ...userWhereFilter, createdAt: { gte: since14d, lt: since7d } } }),
    prisma.message.count({ where: { ...userIdScoped, createdAt: { gte: since7d }, role: "user" } }),
    prisma.message.count({ where: { ...userIdScoped, createdAt: { gte: since14d, lt: since7d }, role: "user" } }),
    prisma.dailyCheckin.count({ where: { ...userIdScoped, createdAt: { gte: since7d } } }),
    prisma.dailyCheckin.count({ where: { ...userIdScoped, createdAt: { gte: since14d, lt: since7d } } }),
    prisma.user.findMany({ where: { ...userWhereFilter, createdAt: { gte: since } }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 50000 }),
    prisma.message.findMany({ where: { ...userIdScoped, createdAt: { gte: since }, role: "user" }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 50000 }),
    prisma.dailyCheckin.findMany({ where: { ...userIdScoped, createdAt: { gte: since } }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 50000 }),
    prisma.conversation.count({ where: { ...userIdScoped, createdAt: { gte: since7d } } }),
    prisma.conversation.count({ where: { ...userIdScoped, createdAt: { gte: since14d, lt: since7d } } }),
    prisma.userState.groupBy({ by: ["state"], where: userIdScoped, _count: { state: true } }),
    prisma.subscription.groupBy({ by: ["plan", "status"], where: userIdScoped, _count: { plan: true } }),
    prisma.goal.count({ where: { ...userIdScoped, status: "active" } }),
    prisma.goal.count({ where: { ...userIdScoped, status: "completed" } }),
    prisma.goal.count({ where: { ...userIdScoped, status: "abandoned" } }),
    prisma.action.count({ where: userIdFilter ? { goal: { userId: userIdFilter } } : {} }),
    prisma.action.count({ where: { completed: true, ...(userIdFilter ? { goal: { userId: userIdFilter } } : {}) } }),
  ]);

  // ── Daily trends (30 days) ──
  const days: string[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    days.push(dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }

  const usersByDay = new Map<string, number>();
  const messagesByDay = new Map<string, number>();
  const checkinsByDay = new Map<string, number>();

  for (const u of recentUsers) usersByDay.set(dayKey(u.createdAt), (usersByDay.get(dayKey(u.createdAt)) ?? 0) + 1);
  for (const m of recentMessages) messagesByDay.set(dayKey(m.createdAt), (messagesByDay.get(dayKey(m.createdAt)) ?? 0) + 1);
  for (const c of recentCheckins) checkinsByDay.set(dayKey(c.createdAt), (checkinsByDay.get(dayKey(c.createdAt)) ?? 0) + 1);

  const dailyTrends = days.map((day) => ({
    date: day,
    signups: usersByDay.get(day) ?? 0,
    messages: messagesByDay.get(day) ?? 0,
    checkins: checkinsByDay.get(day) ?? 0,
  }));

  // ── Delta calculations ──
  function delta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ── State distribution ──
  const states: Record<string, number> = {};
  for (const row of stateDistribution) {
    states[row.state] = row._count.state;
  }

  // ── Subscription breakdown ──
  const subscriptions: Array<{ plan: string; status: string; count: number }> = [];
  for (const row of subscriptionStats) {
    subscriptions.push({ plan: row.plan, status: row.status, count: row._count.plan });
  }

  // ── Funnel (simplified) ──
  const usersWithGoal = await prisma.goal.findMany({
    where: userIdScoped,
    select: { userId: true },
    distinct: ["userId"],
    take: 50000,
  });
  const usersWithCompletedAction = await prisma.action.findMany({
    where: { completed: true, ...(userIdFilter ? { goal: { userId: userIdFilter } } : {}) },
    select: { goal: { select: { userId: true } } },
    take: 50000,
  });
  const uniqueUsersWithCompletedAction = new Set(usersWithCompletedAction.map((a) => a.goal.userId)).size;

  const usersWithConvo = await prisma.conversation.findMany({
    where: userIdScoped,
    select: { userId: true },
    distinct: ["userId"],
    take: 50000,
  });

  const funnel = {
    registered: totalUsers,
    firstConversation: usersWithConvo.length,
    firstGoal: usersWithGoal.length,
    firstActionCompleted: uniqueUsersWithCompletedAction,
  };

  return NextResponse.json({
    kpis: {
      totalUsers,
      signups7d: { value: usersThisWeek, delta: delta(usersThisWeek, usersPrevWeek) },
      messages7d: { value: messagesThisWeek, delta: delta(messagesThisWeek, messagesPrevWeek) },
      checkins7d: { value: checkinsThisWeek, delta: delta(checkinsThisWeek, checkinsPrevWeek) },
      conversations7d: { value: conversationsThisWeek, delta: delta(conversationsThisWeek, conversationsPrevWeek) },
    },
    dailyTrends,
    stateDistribution: states,
    subscriptions,
    goals: {
      active: goalsActive,
      completed: goalsCompleted,
      abandoned: goalsAbandoned,
      actionCompletionRate: actionsTotal > 0 ? Math.round((actionsCompleted / actionsTotal) * 100) : 0,
    },
    funnel,
    meta: {
      excludeInternal,
      internalUserCount: userIdFilter?.notIn.length ?? 0,
    },
  });
}, { limit: 30 });
