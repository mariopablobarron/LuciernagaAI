import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import { CronSyncConfigError, redactPlan, syncCrons } from "@/services/cronSync";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sync-crons?dryRun=1
 *
 * Sincroniza los crons declarados en src/lib/cronJobs.ts con la cuenta de
 * cron-job.org. Permission: "operations" (admin / superadmin).
 *
 * Por defecto NO aplica cambios. Pasa ?apply=1 explícitamente para ejecutar.
 * El dryRun previo es OBLIGATORIO en filosofía operativa: revisa el plan,
 * y solo si te convence vuelves a llamar con ?apply=1.
 *
 * Identificación: sólo se tocan jobs con título prefijo "[mw-sync] ". Otros
 * jobs creados a mano en cron-job.org NO se modifican ni borran.
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const apply = url.searchParams.get("apply") === "1";
  const dryRun = !apply;

  try {
    const result = await syncCrons({ dryRun });
    const summary = {
      creates: result.plan.filter((a) => a.type === "create").length,
      updates: result.plan.filter((a) => a.type === "update").length,
      deletes: result.plan.filter((a) => a.type === "delete").length,
      noops: result.plan.filter((a) => a.type === "noop").length,
    };

    logInfo("CRON_SYNC", dryRun ? "dry_run" : "applied", {
      ...summary,
      errors: result.errors.length,
    });

    return NextResponse.json({
      mode: dryRun ? "dryRun" : "applied",
      summary,
      plan: redactPlan(result.plan),
      errors: result.errors.map((e) => ({
        action: e.action.type,
        title: "title" in e.action ? e.action.title : undefined,
        error: e.error,
      })),
    });
  } catch (error) {
    if (error instanceof CronSyncConfigError) {
      return NextResponse.json(
        { error: "MISSING_CONFIG", missing: error.missing },
        { status: 503 },
      );
    }
    logError("CRON_SYNC", error, { route: "/api/admin/sync-crons" });
    return NextResponse.json({ error: "SYNC_FAILED", message: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

/**
 * GET /api/admin/sync-crons
 *
 * Devuelve el plan SIN ejecutar nada (alias de POST?dryRun=1, más cómodo
 * desde navegador para inspección rápida).
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await syncCrons({ dryRun: true });
    return NextResponse.json({
      mode: "dryRun",
      summary: {
        creates: result.plan.filter((a) => a.type === "create").length,
        updates: result.plan.filter((a) => a.type === "update").length,
        deletes: result.plan.filter((a) => a.type === "delete").length,
        noops: result.plan.filter((a) => a.type === "noop").length,
      },
      plan: redactPlan(result.plan),
    });
  } catch (error) {
    if (error instanceof CronSyncConfigError) {
      return NextResponse.json({ error: "MISSING_CONFIG", missing: error.missing }, { status: 503 });
    }
    logError("CRON_SYNC", error, { route: "GET /api/admin/sync-crons" });
    return NextResponse.json({ error: "SYNC_FAILED" }, { status: 500 });
  }
}
