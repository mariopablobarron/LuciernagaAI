import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";
import { withCronDedup, dailyUtcKey } from "@/lib/cron-log";
import { invalidateUserDisabledCache } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Espejo del endpoint admin /api/admin/users/purge-anonymous-dormant pero
// disparado automáticamente con CRON_SECRET. Soft-delete de usuarios:
// - email sintético (@session.*.local) o sin passwordHash
// - 0 mensajes nunca enviados
// - lastSeen > 30 días
// - sin canal alcanzable (telegramId, googleId, push)
//
// Solución 2/2 al ruido de "usuarios anónimos" detectado 2026-06-01:
// (1) bot-detection.ts evita crear el row en BD en primer lugar para bots
//     conocidos (Googlebot, scanners, etc).
// (2) este cron limpia los que se hayan colado igualmente (humanos que
//     entraron, leyeron 30s y nunca volvieron).
const DORMANT_DAYS = 30;

async function handler(req: Request): Promise<Response> {
  const unauthorized = requireCronSecret(req as NextRequest);
  if (unauthorized) return unauthorized;

  const prisma = getPrismaClient();
  const cutoff = new Date(Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000);
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    lastSeen: { lt: cutoff },
    messages: { none: {} },
    telegramId: null,
    googleId: null,
    pushSubscriptions: { none: {} },
    OR: [
      { passwordHash: null },
      { email: { endsWith: "@session.latidos.local" } },
      { email: { endsWith: "@session.luciernaga.local" } },
    ],
  };

  try {
    if (dryRun) {
      const total = await prisma.user.count({ where });
      logInfo("CRON", "purge_anonymous_dormant_dryrun", {
        candidates: total,
        cutoff: cutoff.toISOString(),
      });
      return NextResponse.json({
        ok: true,
        mode: "dryRun",
        cutoff: cutoff.toISOString(),
        candidates: total,
      });
    }

    // Soft-delete. Hard-delete real ya se hace por retention-hard-delete cron.
    const result = await prisma.user.updateMany({
      where,
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalida el cache de los soft-deleted para que la próxima sesión
    // (si por algún motivo vuelve) sea rechazada inmediatamente.
    // Solo para los <= 100 últimos por límite de memoria.
    if (result.count > 0 && result.count <= 100) {
      const sample = await prisma.user.findMany({
        where: { ...where, deletedAt: { not: null } },
        select: { id: true },
        take: 100,
      });
      for (const u of sample) invalidateUserDisabledCache(u.id);
    }

    logInfo("CRON", "purge_anonymous_dormant_executed", {
      purged: result.count,
      cutoff: cutoff.toISOString(),
    });
    return NextResponse.json({
      ok: true,
      mode: "executed",
      cutoff: cutoff.toISOString(),
      purged: result.count,
    });
  } catch (error) {
    logError("CRON", error, { action: "purge_anonymous_dormant_failed" });
    sendAutomatedAlert({
      type: "warning",
      title: "Cron falló: purge-anonymous-dormant",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronDedup(
  "purge-anonymous-dormant",
  () => dailyUtcKey(),
  handler,
);
