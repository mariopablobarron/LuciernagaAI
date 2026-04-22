import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { backfillActivationFields } from "@/services/activation";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// POST /api/admin/backfill-activation
// Admin-triggered backfill (same logic as the cron endpoint, gated by admin
// session instead of CRON_SECRET). Idempotent — safe to re-run.
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "5000");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 5000;

  try {
    const stats = await backfillActivationFields(limit);
    return NextResponse.json({ ok: true, stats, limit });
  } catch (err: unknown) {
    logError("BACKFILL_ACTIVATION", err, { area: "admin_run" });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
