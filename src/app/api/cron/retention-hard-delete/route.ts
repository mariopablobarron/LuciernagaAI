import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";

const RETENTION_DAYS = 90;
const BATCH_CAP = 50;

// GET /api/cron/retention-hard-delete?secret=CRON_SECRET
// Run daily. Hard-deletes users whose deletedAt is older than 90 days.
// Cap of 50 users per run to keep the transaction bounded.
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const prisma = getPrismaClient();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const candidates = await prisma.user.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true, email: true, deletedAt: true },
      orderBy: { deletedAt: "asc" },
      take: BATCH_CAP,
    });

    let deleted = 0;
    const failures: Array<{ id: string; error: string }> = [];
    for (const u of candidates) {
      try {
        await prisma.user.delete({ where: { id: u.id } });
        deleted++;
      } catch (error) {
        failures.push({
          id: u.id,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    logInfo("CRON", "retention_hard_delete_done", {
      candidates: candidates.length,
      deleted,
      failures: failures.length,
      cutoff: cutoff.toISOString(),
    });

    if (failures.length > 0) {
      sendAutomatedAlert({
        type: "warning",
        title: "Retention hard-delete: algunos borrados fallaron",
        message: `Falló ${failures.length}/${candidates.length}. Primer error: ${failures[0]?.error ?? "n/a"}`,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      cutoff: cutoff.toISOString(),
      candidates: candidates.length,
      deleted,
      failures: failures.length,
    });
  } catch (error) {
    logError("CRON", error, { action: "retention_hard_delete_failed" });
    sendAutomatedAlert({
      type: "critical",
      title: "Cron falló: retention-hard-delete",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
