import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/avoidance-patterns
 *
 * Returns the user's avoidance patterns: what they avoid, how often, and trends.
 */
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  if (!identity.userId) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // All avoidance events in last 30 days with action details
    const events = await prisma.avoidanceEvent.findMany({
      where: { userId: identity.userId, createdAt: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        type: true,
        createdAt: true,
        action: {
          select: {
            description: true,
            completed: true,
            goal: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by action description to find patterns
    const actionMap = new Map<string, {
      action: string;
      goal: string | null;
      total: number;
      last7d: number;
      types: Record<string, number>;
      lastSeen: Date;
      completed: boolean;
    }>();

    for (const ev of events) {
      const key = ev.action.description;
      const existing = actionMap.get(key);
      const isRecent = ev.createdAt >= sevenDaysAgo;

      if (existing) {
        existing.total++;
        if (isRecent) existing.last7d++;
        existing.types[ev.type] = (existing.types[ev.type] ?? 0) + 1;
        if (ev.createdAt > existing.lastSeen) existing.lastSeen = ev.createdAt;
      } else {
        actionMap.set(key, {
          action: key,
          goal: ev.action.goal?.title ?? null,
          total: 1,
          last7d: isRecent ? 1 : 0,
          types: { [ev.type]: 1 },
          lastSeen: ev.createdAt,
          completed: ev.action.completed,
        });
      }
    }

    // Sort by frequency
    const patterns = [...actionMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((p) => ({
        action: p.action,
        goal: p.goal,
        total: p.total,
        last7d: p.last7d,
        dominantType: Object.entries(p.types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "avoidance",
        lastSeen: p.lastSeen.toISOString(),
        resolved: p.completed,
      }));

    // Weekly trend (last 4 weeks)
    const weeks: { week: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = events.filter((e) => e.createdAt >= weekStart && e.createdAt < weekEnd).length;
      weeks.push({
        week: `Sem ${4 - i}`,
        count,
      });
    }

    // Summary stats
    const total30d = events.length;
    const total7d = events.filter((e) => e.createdAt >= sevenDaysAgo).length;
    const byType = { postpone: 0, refuse: 0, avoidance: 0 };
    for (const ev of events) {
      if (ev.type in byType) byType[ev.type as keyof typeof byType]++;
    }

    return NextResponse.json({
      ok: true,
      summary: { total30d, total7d, byType },
      patterns,
      trend: weeks,
    });
  } catch (error) {
    logError("USER", error, { action: "avoidance_patterns", userId: identity.userId });
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}
