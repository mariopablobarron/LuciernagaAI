import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import {
  getAttributionReport,
  type AttributionRange,
} from "@/services/attribution";

export const dynamic = "force-dynamic";

const VALID_RANGES: readonly AttributionRange[] = ["7d", "30d", "90d", "all"] as const;

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:metrics");
  if (auth instanceof NextResponse) return auth;

  try {
    const rangeParam = (req.nextUrl.searchParams.get("range") ?? "30d").toLowerCase();
    const range: AttributionRange = (VALID_RANGES as readonly string[]).includes(
      rangeParam,
    )
      ? (rangeParam as AttributionRange)
      : "30d";

    const report = await getAttributionReport(range);
    return NextResponse.json({ report });
  } catch (error: unknown) {
    logError("ADMIN_MARKETING", error, { route: "attribution_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
