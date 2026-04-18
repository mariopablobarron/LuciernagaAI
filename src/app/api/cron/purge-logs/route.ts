import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { withCronLog } from "@/lib/cron-log";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/purge-logs?secret=CRON_SECRET
 *
 * Retención por tabla:
 *   - SystemLog:  30 días
 *   - EmailLog:   90 días (auditoría más larga)
 *   - CronRunLog: 90 días
 *   - WebhookLog: 30 días
 *
 * Ejecutar diariamente. SystemLog se borra en lotes de 5000 para no bloquear la BD.
 */
const RETENTION = {
  systemLog: 30,
  emailLog: 90,
  cronRunLog: 90,
  webhookLog: 30,
} as const;

const BATCH_SIZE = 5000;

type PurgeResult = { deleted: number; ok: boolean; error?: string };

async function purge(
  table: string,
  days: number,
  deleteFn: (cutoff: Date) => Promise<number>,
): Promise<PurgeResult> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const deleted = await deleteFn(cutoff);
    return { deleted, ok: true };
  } catch (err) {
    logError("CRON", err, { action: "purge_logs", table });
    return { deleted: 0, ok: false, error: (err as Error).message };
  }
}

export const GET = withCronLog("purge-logs", async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  const [systemLog, emailLog, cronRunLog, webhookLog] = await Promise.all([
    purge("SystemLog", RETENTION.systemLog, async (cutoff) => {
      let total = 0;
      let lastDeleted = 0;
      do {
        const oldIds = await prisma.systemLog.findMany({
          where: { timestamp: { lt: cutoff } },
          select: { id: true },
          take: BATCH_SIZE,
        });
        if (oldIds.length === 0) break;
        const res = await prisma.systemLog.deleteMany({
          where: { id: { in: oldIds.map((r) => r.id) } },
        });
        lastDeleted = res.count;
        total += lastDeleted;
      } while (lastDeleted === BATCH_SIZE);
      return total;
    }),
    purge("EmailLog", RETENTION.emailLog, async (cutoff) =>
      (await prisma.emailLog.deleteMany({ where: { createdAt: { lt: cutoff } } })).count,
    ),
    purge("CronRunLog", RETENTION.cronRunLog, async (cutoff) =>
      (await prisma.cronRunLog.deleteMany({ where: { startedAt: { lt: cutoff } } })).count,
    ),
    purge("WebhookLog", RETENTION.webhookLog, async (cutoff) =>
      (await prisma.webhookLog.deleteMany({ where: { receivedAt: { lt: cutoff } } })).count,
    ),
  ]);

  const totalDeleted =
    systemLog.deleted + emailLog.deleted + cronRunLog.deleted + webhookLog.deleted;

  const results = { systemLog, emailLog, cronRunLog, webhookLog, totalDeleted };
  logInfo("CRON", "purge_logs_done", results);

  return {
    response: NextResponse.json({ ok: true, ...results }),
    recordsProcessed: totalDeleted,
    metadata: results as unknown as Record<string, unknown>,
  };
});
