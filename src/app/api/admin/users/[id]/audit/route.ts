import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id]/audit
// Returns the last N admin actions affecting this user (resource="User" OR metadata.targetUserId=id).
export async function GET(req: NextRequest, ctx: unknown) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await (ctx as Params).params;
    if (!id) {
      return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const entries = await prisma.auditLog.findMany({
      where: { resource: "User", resourceId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        actorId: true,
        actorType: true,
        action: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        actorId: e.actorId,
        actorType: e.actorType,
        action: e.action,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logError("ADMIN", error, { route: "GET /api/admin/users/[id]/audit" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
