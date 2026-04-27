import { type NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { createSnapshotForUser, listSnapshotEligibleUsers } from "@/services/capsules";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// GET /api/cron/capsule-snapshot?secret=CRON_SECRET
//
// Corre 1 vez al día. Genera un snapshot por cada usuario elegible:
//   - activo, lastSeen <90d, ≥5 mensajes propios
//   - sin snapshot en los últimos 30 días
//
// Idempotente: re-ejecutar el mismo día no duplica (createSnapshotForUser
// detecta el snapshot del día y devuelve null).
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const eligible = await listSnapshotEligibleUsers({ take: 200 });
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of eligible) {
      try {
        const result = await createSnapshotForUser(user.userId);
        if (result) created++;
        else skipped++;
      } catch (error) {
        failed++;
        logError("CRON", error, {
          action: "capsule_snapshot_create_failed",
          userId: user.userId,
        });
      }
    }

    logInfo("CRON", "capsule_snapshot_done", {
      eligible: eligible.length,
      created,
      skipped,
      failed,
    });

    return NextResponse.json({ ok: true, eligible: eligible.length, created, skipped, failed });
  } catch (error) {
    logError("CRON", error, { action: "capsule_snapshot_failed" });
    sendAutomatedAlert({
      type: "warning",
      title: "Cron falló: capsule-snapshot",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.json({ error: "CAPSULE_SNAPSHOT_FAILED" }, { status: 500 });
  }
}
