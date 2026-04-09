import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { notifyAdmin } from "@/services/telegram";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

type StateCount = { state: string; _count: { state: number } };

function buildDailyReport(data: {
  activeToday: number;
  newToday: number;
  messagesTotal: number;
  stateDistribution: StateCount[];
  blockedOrCrisis: { id: string; state: string; crisisActive: boolean }[];
  topStreaks: { userId: string; currentDays: number }[];
}): string {
  const stateLines = data.stateDistribution
    .map((s) => `  • ${s.state}: ${s._count.state}`)
    .join("\n");

  const urgentUsers = data.blockedOrCrisis
    .map((u) => `  • \`${u.id}\` — ${u.crisisActive ? "🚨 crisis" : u.state}`)
    .join("\n");

  const streakLines = data.topStreaks
    .slice(0, 5)
    .map((s) => `  • \`${s.userId}\` — ${s.currentDays} días`)
    .join("\n");

  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return [
    `📊 *Reporte diario — ${today}*`,
    "",
    `👥 *Actividad*`,
    `  Activos hoy: ${data.activeToday}`,
    `  Nuevos hoy: ${data.newToday}`,
    `  Mensajes totales: ${data.messagesTotal}`,
    "",
    `🧠 *Distribución emocional*`,
    stateLines || "  Sin datos",
    "",
    `🚨 *Usuarios en bloqueo o crisis*`,
    urgentUsers || "  Ninguno",
    "",
    `🔥 *Rachas activas (top 5)*`,
    streakLines || "  Sin datos",
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      activeToday,
      newToday,
      messagesTotal,
      stateDistribution,
      blockedOrCrisis,
      topStreaks,
    ] = await Promise.all([
      // Users seen today
      prisma.user.count({ where: { lastSeen: { gte: startOfDay } } }),

      // New users today
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),

      // Messages sent today
      prisma.message.count({ where: { createdAt: { gte: startOfDay } } }),

      // Emotional state distribution
      prisma.userState.groupBy({
        by: ["state"],
        _count: { state: true },
        orderBy: { _count: { state: "desc" } },
      }),

      // Blocked or in active crisis
      prisma.userState.findMany({
        where: {
          OR: [{ state: "bloqueo" }, { crisisActive: true }],
        },
        select: { userId: true, state: true, crisisActive: true },
        take: 20,
      }).then((rows) => rows.map((r) => ({ id: r.userId, state: r.state, crisisActive: r.crisisActive }))),

      // Top active streaks
      prisma.streak.findMany({
        where: { currentDays: { gt: 0 } },
        orderBy: { currentDays: "desc" },
        take: 5,
        select: { userId: true, currentDays: true },
      }),
    ]);

    const report = buildDailyReport({
      activeToday,
      newToday,
      messagesTotal,
      stateDistribution: stateDistribution as StateCount[],
      blockedOrCrisis,
      topStreaks,
    });

    notifyAdmin(report);

    logInfo("ADMIN", "telegram_report_sent", { activeToday, newToday });

    return NextResponse.json({ ok: true, report });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/telegram-report" });
    return NextResponse.json({ error: "REPORT_FAILED" }, { status: 500 });
  }
}
