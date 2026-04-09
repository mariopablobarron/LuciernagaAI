import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { notifyAdmin } from "@/services/telegram";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";

// GET /api/cron/weekly-summary
// Triggered by a cron job (e.g. Coolify scheduled task or Vercel cron).
// Sends a Telegram summary of the past 7 days to the admin/psychologist.
// Protect with CRON_SECRET env var.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      activeUsers,
      newUsers,
      totalMessages,
      crisisEvents,
      checkIns,
      completedAssessments,
    ] = await Promise.all([
      prisma.user.count({ where: { lastSeen: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.message.count({ where: { createdAt: { gte: since }, role: "user" } }),
      prisma.crisisEvent.findMany({
        where: { createdAt: { gte: since }, level: { in: ["high", "critical"] } },
        select: { userId: true, level: true, createdAt: true, message: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.dailyLog.count({ where: { createdAt: { gte: since } } }),
      prisma.assessmentResponse.count({ where: { completedAt: { gte: since } } }),
    ]);

    const crisisLines = crisisEvents.length > 0
      ? crisisEvents
          .map((e) => `  · \`${e.userId}\` — *${e.level}* — ${e.message.slice(0, 60)}`)
          .join("\n")
      : "  · Ninguno";

    const report = [
      `📊 *Resumen semanal — Tres Mil Millones de Latidos*`,
      `_Período: últimos 7 días_`,
      ``,
      `👥 Usuarios activos: *${activeUsers}*`,
      `🆕 Nuevos registros: *${newUsers}*`,
      `💬 Mensajes enviados: *${totalMessages}*`,
      `✅ Check-ins: *${checkIns}*`,
      `📋 Evaluaciones completadas: *${completedAssessments}*`,
      ``,
      `🚨 *Crisis (high/critical): ${crisisEvents.length}*`,
      crisisLines,
    ].join("\n");

    notifyAdmin(report);

    logInfo("CRON", "weekly_summary_sent", {
      activeUsers, newUsers, totalMessages, crisisCount: crisisEvents.length,
    });

    return NextResponse.json({ ok: true, activeUsers, newUsers, totalMessages });
  } catch (error: unknown) {
    logError("CRON", error, { action: "weekly_summary_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: weekly-summary", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
