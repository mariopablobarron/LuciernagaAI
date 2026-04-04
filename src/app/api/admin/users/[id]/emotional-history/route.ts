import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveAdminAuth } from "@/lib/admin-auth";

// GET /api/admin/users/[id]/emotional-history?days=30
// Returns daily emotional state for the last N days (from DailyLog)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? "30")));

  const prisma = getPrismaClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [logs, crisisEvents] = await Promise.all([
    prisma.dailyLog.findMany({
      where: { userId, logDate: { gte: since } },
      orderBy: { logDate: "asc" },
      select: {
        logDate: true,
        emotionalState: true,
        mood: true,
        momentum: true,
        checkIns: true,
      },
    }),
    prisma.crisisEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, level: true },
    }),
  ]);

  const timeline = logs.map((log) => ({
    date: log.logDate.toISOString().slice(0, 10),
    emotionalState: log.emotionalState ?? "unknown",
    mood: log.mood ?? null,
    momentum: log.momentum ?? null,
    hasCheckin: log.checkIns > 0,
  }));

  const crisisMarkers = crisisEvents.map((e) => ({
    date: e.createdAt.toISOString().slice(0, 10),
    level: e.level,
  }));

  return NextResponse.json({ timeline, crisisMarkers, days });
}
