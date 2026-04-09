import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { countSegment } from "@/services/marketing-segments";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "marketing:segments");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get("segment") ?? "all";

    const counts = await countSegment(segment);

    return NextResponse.json({
      segment,
      telegram: counts.telegram,
      email: counts.email,
      total: counts.total,
    });
  } catch (error: unknown) {
    logError("MARKETING_SEGMENTS", error, { route: "/api/admin/marketing/segments" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch segment counts." },
      { status: 500 },
    );
  }
}, { limit: 60 });
