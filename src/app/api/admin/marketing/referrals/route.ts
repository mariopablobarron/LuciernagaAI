import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { getReferralSummary } from "@/services/referralsAnalytics";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:referrals";

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const summary = await getReferralSummary();
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    logError("ADMIN_MARKETING", error, { route: "referrals_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
