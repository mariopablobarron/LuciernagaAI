import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendTelegramWithButtons } from "./telegram-utils";

const fmt = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : "—";

const ALERT_TAG = "CRON_FAILED_ALERTED";

export async function runCronWatchdog(): Promise<{
  scanned: number;
  alerted: number;
  errors: number;
}> {
  const prisma = getPrismaClient();
  const adminChatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!adminChatId) {
    return { scanned: 0, alerted: 0, errors: 0 };
  }

  const since = new Date(Date.now() - 6 * 3_600_000);
  const failures = await prisma.cronRunLog.findMany({
    where: { status: "failed", startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    select: { id: true, jobName: true, startedAt: true, errorMessage: true, durationMs: true },
  });

  if (failures.length === 0) {
    return { scanned: 0, alerted: 0, errors: 0 };
  }

  const ids = failures.map((f) => f.id);
  const alreadyAlertedRows = await prisma.systemLog.findMany({
    where: { tag: ALERT_TAG, message: { in: ids } },
    select: { message: true },
  });
  const alreadyAlerted = new Set(alreadyAlertedRows.map((r) => r.message));

  let alerted = 0;
  let errors = 0;

  for (const f of failures) {
    if (alreadyAlerted.has(f.id)) continue;

    const text = [
      `❌ *Cron failed: \`${f.jobName}\`*`,
      "",
      `Cuándo: ${fmt(f.startedAt)}`,
      f.durationMs != null ? `Duración: ${(f.durationMs / 1000).toFixed(1)}s` : null,
      f.errorMessage ? `\nError:\n\`\`\`\n${f.errorMessage.slice(0, 400)}\n\`\`\`` : null,
      "",
      `runId: \`${f.id}\``,
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await sendTelegramWithButtons(adminChatId, text, [
      [
        { text: "📋 Ver últimos runs", callback_data: `cron:logs:${f.jobName}` },
        { text: "🔄 Reintentar", callback_data: `cron:retry:${f.jobName}` },
      ],
    ]);

    if (sent.ok) {
      try {
        await prisma.systemLog.create({
          data: {
            level: "info",
            tag: ALERT_TAG,
            message: f.id,
            context: { jobName: f.jobName, alertedAt: new Date().toISOString() },
          },
        });
        alerted += 1;
      } catch (error) {
        logError("CRON_WATCHDOG", error, { area: "dedup_log_create" });
        errors += 1;
      }
    } else {
      errors += 1;
    }
  }

  logInfo("CRON_WATCHDOG", "scan", { scanned: failures.length, alerted, errors });
  return { scanned: failures.length, alerted, errors };
}

export async function buildCronLogsMessage(jobName: string): Promise<string> {
  const prisma = getPrismaClient();
  const runs = await prisma.cronRunLog.findMany({
    where: { jobName },
    orderBy: { startedAt: "desc" },
    take: 8,
    select: { id: true, status: true, startedAt: true, durationMs: true, errorMessage: true, recordsProcessed: true },
  });

  if (runs.length === 0) {
    return `📋 *Cron \`${jobName}\`*\n\n_(sin runs registrados)_`;
  }

  const lines = [
    `📋 *Cron \`${jobName}\`* — últimos ${runs.length} runs`,
    "",
    ...runs.map((r) => {
      const icon = r.status === "success" ? "✅" : r.status === "failed" ? "❌" : "⏳";
      const dur = r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      const recs = r.recordsProcessed != null ? ` · ${r.recordsProcessed} recs` : "";
      const err = r.errorMessage ? ` · err: ${r.errorMessage.slice(0, 80)}` : "";
      return `${icon} ${fmt(r.startedAt)} · ${dur}${recs}${err}`;
    }),
  ];

  return lines.join("\n");
}

export async function retryCronJob(jobName: string): Promise<{ ok: boolean; httpStatus?: number; bodyPreview?: string; error?: string }> {
  const secret = process.env.CRON_SECRET?.trim();
  const baseUrl = process.env.APP_BASE_URL?.trim() || "https://tresmilmillonesdelatidos.es";
  if (!secret) return { ok: false, error: "CRON_SECRET no configurado" };

  // Heurística: el endpoint vive en /api/cron/<jobName>. La mayoría usa GET.
  const safeName = jobName.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeName) return { ok: false, error: "jobName inválido" };

  const url = `${baseUrl.replace(/\/$/, "")}/api/cron/${safeName}?secret=${encodeURIComponent(secret)}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const body = await res.text();
    return { ok: res.ok, httpStatus: res.status, bodyPreview: body.slice(0, 300) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
