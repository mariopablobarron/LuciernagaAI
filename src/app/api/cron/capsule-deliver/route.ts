import { type NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { sendUserEmail } from "@/lib/email";
import { buildCapsuleReadyEmail } from "@/lib/capsuleEmail";
import {
  expireStaleCapsules,
  isEmailDeliverable,
  listCapsulesDueForDelivery,
  markCapsuleReady,
} from "@/services/capsules";
import { requireCronSecret } from "@/lib/cron-auth";
import { withCronDedup, dailyUtcKey } from "@/lib/cron-log";

export const dynamic = "force-dynamic";

// GET /api/cron/capsule-deliver?secret=CRON_SECRET
//
// Corre 1 vez al día.
//   1. Expira ready→expired las cápsulas no abiertas hace >60 días.
//   2. Marca pending→ready las que ya alcanzaron deliverAt, y manda email
//      a quien tenga email real, verificado y opt-in.
//
// Idempotente por status transition: solo procesamos cápsulas en pending;
// tras markCapsuleReady pasan a ready y no vuelven a entrar en el bucle.
// Encima, lock por día UTC vía withCronDedup → llamadas repetidas en el
// mismo día devuelven `dedup_lock` sin tocar BD (defensa preventiva
// añadida tras incidente cron-job.org zombi 2026-05-25).
async function handler(req: Request): Promise<Response> {
  const unauthorized = requireCronSecret(req as NextRequest);
  if (unauthorized) return unauthorized;

  try {
    const expiredResult = await expireStaleCapsules();
    const due = await listCapsulesDueForDelivery({ take: 200 });

    let readyMarked = 0;
    let emailsSent = 0;
    let emailsSkipped = 0;
    let emailsFailed = 0;

    for (const c of due) {
      try {
        await markCapsuleReady(c.capsuleId);
        readyMarked++;

        if (!isEmailDeliverable(c)) {
          emailsSkipped++;
          continue;
        }

        const email = buildCapsuleReadyEmail({
          to: c.email,
          userId: c.userId,
          capsuleId: c.capsuleId,
          kind: c.kind,
        });
        const ok = await sendUserEmail(email);
        if (ok) emailsSent++;
        else emailsFailed++;
      } catch (error) {
        emailsFailed++;
        logError("CRON", error, {
          action: "capsule_deliver_user_failed",
          capsuleId: c.capsuleId,
          userId: c.userId,
        });
      }
    }

    logInfo("CRON", "capsule_deliver_done", {
      expired: expiredResult.expired,
      due: due.length,
      readyMarked,
      emailsSent,
      emailsSkipped,
      emailsFailed,
    });

    return NextResponse.json({
      ok: true,
      expired: expiredResult.expired,
      due: due.length,
      readyMarked,
      emailsSent,
      emailsSkipped,
      emailsFailed,
    });
  } catch (error) {
    logError("CRON", error, { action: "capsule_deliver_failed" });
    sendAutomatedAlert({
      type: "warning",
      title: "Cron falló: capsule-deliver",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.json({ error: "CAPSULE_DELIVER_FAILED" }, { status: 500 });
  }
}

export const GET = withCronDedup(
  "capsule-deliver",
  () => dailyUtcKey(),
  handler,
);
