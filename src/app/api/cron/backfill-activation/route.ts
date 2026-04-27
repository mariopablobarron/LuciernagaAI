import { type NextRequest, NextResponse } from "next/server";
import { backfillActivationFields } from "@/services/activation";
import { logError } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";

// GET /api/cron/backfill-activation?secret=CRON_SECRET&limit=500
//
// Idempotent. Safe to call multiple times — skips rows already populated.
// Shared with POST /api/admin/backfill-activation (admin-triggered).
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 500;

  try {
    const stats = await backfillActivationFields(limit);
    return NextResponse.json({ ok: true, stats, limit });
  } catch (err: unknown) {
    logError("BACKFILL_ACTIVATION", err, { area: "cron_run" });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
