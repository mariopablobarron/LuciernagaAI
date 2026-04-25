import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : "—";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Missing TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_ID" }, { status: 500 });
  }

  const prisma = getPrismaClient();

  try {
    const sinceWeekly = new Date(Date.now() - 8 * 86_400_000);
    const [total, notified, lastWeekly, lastRun] = await Promise.all([
      prisma.weeklyLetter.count(),
      prisma.weeklyLetter.count({ where: { emailNotifiedAt: { not: null } } }),
      prisma.weeklyLetter.aggregate({
        _max: { createdAt: true, weekStart: true },
        _count: { _all: true },
        where: { createdAt: { gte: sinceWeekly } },
      }),
      prisma.cronRunLog.findFirst({
        where: { jobName: "weekly-letter" },
        orderBy: { startedAt: "desc" },
        select: { status: true, startedAt: true, finishedAt: true, durationMs: true, recordsProcessed: true, errorMessage: true },
      }),
    ]);

    const lastWeek = lastWeekly._count._all;
    const status = lastRun?.status ?? "—";
    const statusIcon = status === "success" ? "✅" : status === "failed" ? "❌" : status === "running" ? "⏳" : "❓";

    const lines = [
      `${statusIcon} *Weekly Letter — resumen*`,
      "",
      `*Última ejecución del cron:* ${fmt(lastRun?.startedAt)}`,
      `Estado: ${status}` + (lastRun?.durationMs ? ` (${(lastRun.durationMs / 1000).toFixed(1)}s)` : ""),
      lastRun?.recordsProcessed != null ? `Cartas generadas en ese run: ${lastRun.recordsProcessed}` : null,
      lastRun?.errorMessage ? `⚠️ Error: ${lastRun.errorMessage.slice(0, 200)}` : null,
      "",
      `*Acumulado en BD:*`,
      `Total cartas: ${total}`,
      `Con email enviado: ${notified}`,
      `Generadas en últimos 8 días: ${lastWeek}`,
      lastWeekly._max.weekStart ? `Última weekStart: ${fmt(lastWeekly._max.weekStart)}` : null,
    ].filter(Boolean);

    const message = lines.join("\n");

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });

    const tgBody = await tgRes.text();
    if (!tgRes.ok) {
      logError("WEEKLY_LETTER_SUMMARY", new Error(`Telegram HTTP ${tgRes.status}`), { body: tgBody.slice(0, 200) });
      return NextResponse.json({ ok: false, telegram: tgRes.status }, { status: 500 });
    }

    logInfo("WEEKLY_LETTER_SUMMARY", "sent", { total, notified, lastRunStatus: status });

    return NextResponse.json({
      ok: true,
      sent: { total, notified, lastWeek, lastRun },
    });
  } catch (error) {
    logError("WEEKLY_LETTER_SUMMARY", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
