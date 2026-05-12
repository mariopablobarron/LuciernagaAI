import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/distribution
 *
 * Lista DiscoveryMatch filtrados por status (default: pending) ordenados
 * por llmScore desc. Soporta paginación simple.
 *
 * Query params:
 *   status: pending | approved | rejected | published | all (default: pending)
 *   limit: 1-100 (default: 50)
 *   platform: reddit | hn (opcional)
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    const platform = req.nextUrl.searchParams.get("platform");
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "50")));

    const where: Record<string, unknown> = {};
    if (status !== "all") where.status = status;
    if (platform) where.platform = platform;

    const prisma = getPrismaClient();
    const matches = await prisma.discoveryMatch.findMany({
      where,
      orderBy: [{ llmScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    // Stats agregados
    const counts = await prisma.discoveryMatch.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    return NextResponse.json({
      matches,
      stats: counts.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = c._count._all;
        return acc;
      }, {}),
    });
  } catch (error) {
    logError("DISCOVERY", error, { action: "list" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
