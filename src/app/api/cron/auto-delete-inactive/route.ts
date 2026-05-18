/**
 * GET /api/cron/auto-delete-inactive?secret=CRON_SECRET
 *
 * Cron diario que hace SOFT-DELETE de usuarios que:
 *  1. Tienen UserPreferences.autoDeleteAfter30dInactive = true (opt-in)
 *  2. Su lastSeen es más viejo que 30 días
 *  3. No están ya borrados (deletedAt IS NULL)
 *
 * El borrado real (hard delete) lo hace después el cron de retención
 * existente (/api/cron/retention-hard-delete) cuando el deletedAt
 * supere los 90 días desde aquí. Esto da al usuario una ventana de
 * recuperación de 60 días si vuelve antes (deletedAt → null en login).
 *
 * Batch cap: 50 users por ejecución para mantener la transacción
 * acotada. Si hay más candidatos, se procesarán en el siguiente run.
 *
 * Programar en VPS crontab: `0 4 * * *` (diario 04:00 UTC) — fuera de
 * horas de uso, después del backup mentor-db (03:30).
 */

import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";

const INACTIVE_DAYS = 30;
const BATCH_CAP = 50;

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const prisma = getPrismaClient();
    const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

    // Candidatos: opt-in + inactivos + no borrados aún.
    const candidates = await prisma.user.findMany({
      where: {
        deletedAt: null,
        lastSeen: { lt: cutoff },
        preferences: {
          autoDeleteAfter30dInactive: true,
        },
      },
      select: { id: true, lastSeen: true },
      orderBy: { lastSeen: "asc" },
      take: BATCH_CAP,
    });

    let softDeleted = 0;
    const failures: Array<{ id: string; error: string }> = [];

    for (const user of candidates) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
          },
        });
        softDeleted++;
      } catch (error) {
        failures.push({
          id: user.id,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    logInfo("CRON", "auto_delete_inactive_done", {
      candidates: candidates.length,
      softDeleted,
      failures: failures.length,
      cutoff: cutoff.toISOString(),
      inactiveDays: INACTIVE_DAYS,
    });

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      softDeleted,
      failures: failures.length,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    logError("CRON", error, { route: "/api/cron/auto-delete-inactive" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
