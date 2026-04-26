import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { fetchUtmBreakdown, fetchUtmDaily, getPosthogConfig, type Range } from "@/lib/posthog-query";

export const dynamic = "force-dynamic";

const VALID_RANGES: readonly Range[] = ["7d", "30d", "90d"];

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:metrics");
  if (auth instanceof NextResponse) return auth;

  const cfg = getPosthogConfig();
  if (!cfg) {
    return NextResponse.json(
      {
        ok: false,
        error: "POSTHOG_NOT_CONFIGURED",
        message:
          "Faltan env vars: POSTHOG_API_HOST, POSTHOG_PROJECT_ID, POSTHOG_PERSONAL_API_KEY. Generar Personal API Key en PostHog → Settings → User → Personal API Keys (scope query:read).",
      },
      { status: 200 },
    );
  }

  try {
    const rangeParam = (req.nextUrl.searchParams.get("range") ?? "30d").toLowerCase();
    const range: Range = (VALID_RANGES as readonly string[]).includes(rangeParam)
      ? (rangeParam as Range)
      : "30d";
    const source = req.nextUrl.searchParams.get("source") ?? undefined;
    const campaign = req.nextUrl.searchParams.get("campaign") ?? undefined;

    const [breakdown, daily] = await Promise.all([
      fetchUtmBreakdown(cfg, range),
      fetchUtmDaily(cfg, range, { source, campaign }),
    ]);

    if (breakdown === null || daily === null) {
      return NextResponse.json(
        { ok: false, error: "POSTHOG_QUERY_FAILED", message: "PostHog rechazó la query (revisa credenciales o scope)." },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      range,
      filter: { source: source ?? null, campaign: campaign ?? null },
      breakdown,
      daily,
    });
  } catch (error) {
    logError("ADMIN_MARKETING", error, { route: "posthog-utm" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
