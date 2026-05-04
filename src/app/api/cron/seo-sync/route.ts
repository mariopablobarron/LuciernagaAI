import { type NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";
import { syncAll } from "@/services/seo-sync";
import { runAllDetectors } from "@/services/seo-opportunities";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // sync de 28 días puede tardar 1-3 min

/**
 * GET /api/cron/seo-sync?secret=CRON_SECRET[&daysBack=28][&skipDetectors=1]
 *
 * Pipeline diario del agente SEO:
 *   1. Descarga GA4 daily by page (28 días).
 *   2. Descarga GSC daily by query (28 días).
 *   3. Descarga GSC daily by page (28 días).
 *   4. Ejecuta los 10 detectores de oportunidades.
 *   5. Upsert oportunidades en SeoOpportunity.
 *
 * Recomendado: ejecutar 1× al día (e.g. cron-job.org a las 04:00 UTC).
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const daysBack = Number(req.nextUrl.searchParams.get("daysBack") ?? "28");
  const skipDetectors = req.nextUrl.searchParams.get("skipDetectors") === "1";

  try {
    logInfo("CRON", "seo_sync_started", { daysBack, skipDetectors });
    const sync = await syncAll(daysBack);

    let detectors: Awaited<ReturnType<typeof runAllDetectors>> | null = null;
    if (!skipDetectors) {
      detectors = await runAllDetectors();
    }

    return NextResponse.json({
      ok: true,
      sync,
      detectors,
    });
  } catch (error) {
    logError("CRON", error, { route: "/api/cron/seo-sync" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
