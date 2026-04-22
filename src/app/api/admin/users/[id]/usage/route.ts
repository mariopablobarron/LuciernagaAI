import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type DailyBucket = {
  date: string; // YYYY-MM-DD en zona horaria Madrid
  totalMs: number;
  chatMs: number;
  appMs: number;
  sessionsCount: number;
};

function clampDays(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(7, Math.trunc(n)));
}

// Devuelve YYYY-MM-DD en zona horaria Europe/Madrid
function toMadridDateKey(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // "YYYY-MM-DD"
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
    }

    const days = clampDays(req.nextUrl.searchParams.get("days"));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const prisma = getPrismaClient();
    const sessions = await prisma.usageSession.findMany({
      where: {
        userId: id,
        startedAt: { gte: since },
      },
      select: {
        startedAt: true,
        durationMs: true,
        surface: true,
      },
      orderBy: { startedAt: "asc" },
    });

    const buckets = new Map<string, DailyBucket>();
    // Pre-rellenamos los días para que la gráfica no tenga huecos
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = toMadridDateKey(d);
      buckets.set(key, { date: key, totalMs: 0, chatMs: 0, appMs: 0, sessionsCount: 0 });
    }

    let totalMs = 0;
    let chatMs = 0;
    let appMs = 0;
    const activeDays = new Set<string>();

    for (const s of sessions) {
      const key = toMadridDateKey(s.startedAt);
      const bucket =
        buckets.get(key) ??
        (() => {
          const fresh: DailyBucket = { date: key, totalMs: 0, chatMs: 0, appMs: 0, sessionsCount: 0 };
          buckets.set(key, fresh);
          return fresh;
        })();
      bucket.totalMs += s.durationMs;
      bucket.sessionsCount += 1;
      if (s.surface === "chat") bucket.chatMs += s.durationMs;
      else bucket.appMs += s.durationMs;
      totalMs += s.durationMs;
      if (s.surface === "chat") chatMs += s.durationMs;
      else appMs += s.durationMs;
      if (s.durationMs > 0) activeDays.add(key);
    }

    const daily = Array.from(buckets.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    const avgSessionMs = sessions.length > 0 ? Math.round(totalMs / sessions.length) : 0;

    return NextResponse.json({
      days,
      totals: {
        totalMs,
        chatMs,
        appMs,
        sessionsCount: sessions.length,
        activeDays: activeDays.size,
        avgSessionMs,
      },
      daily,
    });
  } catch (error) {
    logError("admin.users.usage", "handler_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
