import { getPrismaClient } from "@/db/prisma";

const fmt = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : "—";

export async function buildWeeklyLetterSummaryMessage(): Promise<string> {
  const prisma = getPrismaClient();
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
      select: { status: true, startedAt: true, durationMs: true, recordsProcessed: true, errorMessage: true },
    }),
  ]);

  const lastWeek = lastWeekly._count._all;
  const status = lastRun?.status ?? "—";
  const statusIcon = status === "success" ? "✅" : status === "failed" ? "❌" : status === "running" ? "⏳" : "❓";

  return [
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
  ]
    .filter(Boolean)
    .join("\n");
}
