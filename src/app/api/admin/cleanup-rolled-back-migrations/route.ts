import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/cleanup-rolled-back-migrations?secret=CRON_SECRET
 *
 * Borra del histórico las filas de `_prisma_migrations` con
 * `rolled_back_at IS NOT NULL` cuyos archivos ya no existen en
 * `prisma/migrations/`. Devuelve la lista de las que iba a borrar y
 * pide explícitamente `?apply=1` para ejecutar — dry-run por defecto.
 *
 * Razón: Coolify v3 no expone Console al Postgres. Estas filas son
 * cosméticas (Prisma las ignora porque ya están rolled_back) pero
 * ensucian /api/cron/diag-migrations y pueden confundir auditorías.
 *
 * GET-equivalent dry-run: pasa sin `apply` y solo lista. Idempotente.
 */
type RolledBackRow = {
  id: string;
  migration_name: string;
  rolled_back_at: Date;
};

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const apply = req.nextUrl.searchParams.get("apply") === "1";
  const prisma = getPrismaClient();

  try {
    const rows = await prisma.$queryRawUnsafe<RolledBackRow[]>(
      `SELECT id, migration_name, rolled_back_at
       FROM "_prisma_migrations"
       WHERE rolled_back_at IS NOT NULL
       ORDER BY rolled_back_at DESC`,
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, found: 0, deleted: 0, dryRun: !apply, rows: [] });
    }

    const summary = rows.map((r) => ({
      id: r.id,
      migration_name: r.migration_name,
      rolled_back_at: r.rolled_back_at,
    }));

    if (!apply) {
      return NextResponse.json({
        ok: true,
        found: rows.length,
        deleted: 0,
        dryRun: true,
        message:
          "Dry-run. Vuelve a llamar con &apply=1 para borrar realmente. Después de aplicar, también conviene borrar la carpeta de la migración en prisma/migrations/ si todavía existe.",
        rows: summary,
      });
    }

    const ids = rows.map((r) => r.id);
    await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE id = ANY($1::text[])`,
      ids,
    );

    logInfo("PRISMA_CLEANUP", "rolled_back_migrations_deleted", {
      count: rows.length,
      names: rows.map((r) => r.migration_name),
    });

    return NextResponse.json({
      ok: true,
      found: rows.length,
      deleted: rows.length,
      dryRun: false,
      rows: summary,
    });
  } catch (error) {
    logError("PRISMA_CLEANUP", error, { route: "/api/admin/cleanup-rolled-back-migrations" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
