import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/analytics/daily-impulse?days=30
// Aggregated DailyLog: per-day distribution of emotionalState/mood + average momentum,
// plus top users with biggest momentum drop in the window.
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? "30")));
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const logs = await prisma.dailyLog.findMany({
    where: { logDate: { gte: since } },
    select: {
      userId: true,
      logDate: true,
      emotionalState: true,
      mood: true,
      momentum: true,
      challengeStatus: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { logDate: "asc" },
  });

  // Per-day aggregates
  const byDay = new Map<string, { date: string; total: number; momentumSum: number; momentumCount: number; states: Record<string, number>; moods: Record<string, number>; challengeDone: number; challengeFailed: number }>();
  for (const log of logs) {
    const date = log.logDate.toISOString().slice(0, 10);
    let entry = byDay.get(date);
    if (!entry) {
      entry = { date, total: 0, momentumSum: 0, momentumCount: 0, states: {}, moods: {}, challengeDone: 0, challengeFailed: 0 };
      byDay.set(date, entry);
    }
    entry.total += 1;
    if (typeof log.momentum === "number") {
      entry.momentumSum += log.momentum;
      entry.momentumCount += 1;
    }
    if (log.emotionalState) entry.states[log.emotionalState] = (entry.states[log.emotionalState] ?? 0) + 1;
    if (log.mood) entry.moods[log.mood] = (entry.moods[log.mood] ?? 0) + 1;
    if (log.challengeStatus === "done" || log.challengeStatus === "completed") entry.challengeDone += 1;
    if (log.challengeStatus === "failed" || log.challengeStatus === "skipped") entry.challengeFailed += 1;
  }

  const dailyTrends = Array.from(byDay.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date,
      total: e.total,
      avgMomentum: e.momentumCount > 0 ? Math.round((e.momentumSum / e.momentumCount) * 10) / 10 : null,
      states: e.states,
      moods: e.moods,
      challengeDone: e.challengeDone,
      challengeFailed: e.challengeFailed,
    }));

  // Global distributions
  const globalStates: Record<string, number> = {};
  const globalMoods: Record<string, number> = {};
  for (const log of logs) {
    if (log.emotionalState) globalStates[log.emotionalState] = (globalStates[log.emotionalState] ?? 0) + 1;
    if (log.mood) globalMoods[log.mood] = (globalMoods[log.mood] ?? 0) + 1;
  }

  // Per-user momentum: compare first half vs second half of window for biggest drops
  const halfMs = (days / 2) * 24 * 60 * 60 * 1000;
  const halfPoint = new Date(Date.now() - halfMs);
  const perUser = new Map<string, { userId: string; email: string; name: string | null; firstHalf: number[]; secondHalf: number[]; lastDate: Date }>();
  for (const log of logs) {
    if (typeof log.momentum !== "number") continue;
    let entry = perUser.get(log.userId);
    if (!entry) {
      entry = { userId: log.userId, email: log.user.email, name: log.user.name, firstHalf: [], secondHalf: [], lastDate: log.logDate };
      perUser.set(log.userId, entry);
    }
    if (log.logDate < halfPoint) entry.firstHalf.push(log.momentum);
    else entry.secondHalf.push(log.momentum);
    if (log.logDate > entry.lastDate) entry.lastDate = log.logDate;
  }

  const avg = (xs: number[]) => xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
  const dropAlerts = Array.from(perUser.values())
    .map((u) => {
      const a = avg(u.firstHalf);
      const b = avg(u.secondHalf);
      if (a === null || b === null) return null;
      return { userId: u.userId, email: u.email, name: u.name, before: Math.round(a * 10) / 10, after: Math.round(b * 10) / 10, drop: Math.round((b - a) * 10) / 10, lastDate: u.lastDate.toISOString() };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.drop < 0)
    .sort((x, y) => x.drop - y.drop)
    .slice(0, 10);

  const totalLogs = logs.length;
  const uniqueUsers = perUser.size;
  const challengeDoneTotal = logs.filter((l) => l.challengeStatus === "done" || l.challengeStatus === "completed").length;
  const challengeAttempted = logs.filter((l) => l.challengeStatus !== null && l.challengeStatus !== "").length;

  return NextResponse.json({
    days,
    totals: {
      logs: totalLogs,
      uniqueUsers,
      challengeCompletionRate: challengeAttempted > 0 ? Math.round((challengeDoneTotal / challengeAttempted) * 100) : 0,
    },
    dailyTrends,
    globalStates,
    globalMoods,
    dropAlerts,
  });
}
