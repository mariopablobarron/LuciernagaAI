import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/snapshots/[id]
 * Devuelve un snapshot completo con todos los datos archivados.
 */
export const GET = withRateLimit(async function GET(
  req: NextRequest,
  ctx?: unknown,
) {
  try {
    const adminAuth = requireAdminPermission(req, "insights:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const prisma = getPrismaClient();
    const snapshot = await prisma.adminSnapshot.findUnique({ where: { id } });

    if (!snapshot) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ snapshot });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), { route: "/api/admin/snapshots/[id]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { limit: 30 });
