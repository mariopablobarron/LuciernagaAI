import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["pending", "sent", "rejected"]);

export async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "users:send-email");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  const where = statusFilter && VALID_STATUSES.has(statusFilter) ? { status: statusFilter } : {};

  try {
    const prisma = getPrismaClient();
    const [items, counts] = await Promise.all([
      prisma.teamLetterRequest.findMany({
        where,
        orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true, createdAt: true, messageCount: true },
          },
        },
      }),
      prisma.teamLetterRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const countByStatus: Record<string, number> = { pending: 0, sent: 0, rejected: 0 };
    for (const row of counts) {
      countByStatus[row.status] = row._count._all;
    }

    return NextResponse.json({ items, countByStatus });
  } catch (error) {
    logError("ADMIN", error, { route: "/api/admin/team-letters", method: "GET" });
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
