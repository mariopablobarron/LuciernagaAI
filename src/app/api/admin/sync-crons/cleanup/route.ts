import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import { CronSyncConfigError, cleanupDuplicateJobs } from "@/services/cronSync";

export const dynamic = "force-dynamic";

/**
 * Elimina de cron-job.org los jobs SIN prefijo [mw-sync] cuya URL apunta a
 * uno de los paths gestionados. Son duplicados de los crons que ahora maneja
 * el sync — antes se configuraron a mano, ahora son redundantes.
 *
 * GET   /api/admin/sync-crons/cleanup            — dry-run: lista candidatos
 * POST  /api/admin/sync-crons/cleanup?apply=1    — borra de verdad
 *
 * Permission: "operations".
 */
function redactJobUrls<T extends { url: string }>(items: T[]): T[] {
  return items.map((d) => ({ ...d, url: d.url.replace(/secret=[^&]+/, "secret=***") }));
}

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await cleanupDuplicateJobs({ dryRun: true });
    return NextResponse.json({
      mode: "dryRun",
      candidates: result.duplicates.length,
      duplicates: redactJobUrls(result.duplicates),
    });
  } catch (error) {
    if (error instanceof CronSyncConfigError) {
      return NextResponse.json({ error: "MISSING_CONFIG", missing: error.missing }, { status: 503 });
    }
    logError("CRON_SYNC", error, { route: "GET /api/admin/sync-crons/cleanup" });
    return NextResponse.json({ error: "CLEANUP_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const apply = url.searchParams.get("apply") === "1";

  try {
    const result = await cleanupDuplicateJobs({ dryRun: !apply });
    logInfo("CRON_SYNC", apply ? "duplicates_cleaned" : "duplicates_dryrun", {
      candidates: result.duplicates.length,
      deleted: result.deleted,
      errors: result.errors.length,
    });
    return NextResponse.json({
      mode: apply ? "applied" : "dryRun",
      candidates: result.duplicates.length,
      deleted: result.deleted,
      duplicates: redactJobUrls(result.duplicates),
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof CronSyncConfigError) {
      return NextResponse.json({ error: "MISSING_CONFIG", missing: error.missing }, { status: 503 });
    }
    logError("CRON_SYNC", error, { route: "POST /api/admin/sync-crons/cleanup" });
    return NextResponse.json({ error: "CLEANUP_FAILED" }, { status: 500 });
  }
}
