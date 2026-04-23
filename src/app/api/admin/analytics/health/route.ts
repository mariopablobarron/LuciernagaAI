import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { getHealthReport } from "@/services/health";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "analytics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const report = await getHealthReport();
    return NextResponse.json(report);
  } catch (error: unknown) {
    logError("admin/analytics/health", error);
    return NextResponse.json(
      { error: "health_report_failed" },
      { status: 500 },
    );
  }
});
