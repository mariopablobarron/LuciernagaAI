import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "marketing:history");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const prisma = getPrismaClient();
    const { searchParams } = new URL(req.url);

    const channel = searchParams.get("channel") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;

    const where = channel ? { channel } : {};

    const [logs, total] = await Promise.all([
      prisma.broadcastLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.broadcastLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page });
  } catch (error: unknown) {
    logError("MARKETING_HISTORY", error, { route: "/api/admin/marketing/history" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch broadcast history." },
      { status: 500 },
    );
  }
}, { limit: 30 });
