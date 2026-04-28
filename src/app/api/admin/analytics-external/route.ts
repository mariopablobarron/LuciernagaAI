import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { isValidCronSecret } from "@/lib/cron-auth";
import { getGA4Snapshot, checkGAReady } from "@/services/google-analytics";
import { getSearchConsoleSnapshot, checkGSCReady } from "@/services/search-console";
import { getMetricoolSnapshot, checkMetricoolReady } from "@/services/metricool";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/admin/analytics-external?range=7|28
 *
 * Aggregates external analytics into a single payload for /admin/analytics:
 *   - Google Analytics 4 (GA4 Data API)
 *   - Google Search Console
 *   - Metricool (social networks)
 *
 * Auth: admin session OR ?secret=CRON_SECRET (so it can be polled by cron
 * for snapshots without admin login).
 *
 * Each provider is queried independently — one failing returns a partial
 * result, not 500. The UI shows a per-provider status card.
 */
export async function GET(req: NextRequest) {
  const hasCronSecret = isValidCronSecret(req.nextUrl.searchParams.get("secret"));
  if (!hasCronSecret) {
    const auth = requireAdminPermission(req, "analytics");
    if (auth instanceof NextResponse) return auth;
  }

  const rangeParam = req.nextUrl.searchParams.get("range");
  const days = rangeParam === "28" ? 28 : 7;

  try {
    const [ga4, gsc, metricool] = await Promise.all([
      getGA4Snapshot(days).catch((err) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      })),
      getSearchConsoleSnapshot(days === 7 ? 28 : days).catch((err) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      })),
      getMetricoolSnapshot(days).catch((err) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      })),
    ]);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      providers: {
        ga4: { configured: checkGAReady().ready, data: ga4 },
        searchConsole: { configured: checkGSCReady().ready, data: gsc },
        metricool: { configured: checkMetricoolReady().ready, data: metricool },
      },
    });
  } catch (error) {
    logError("ANALYTICS_EXTERNAL", error, { route: "/api/admin/analytics-external" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
