import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: {
        emailVerified: false,
        passwordHash: { not: null },
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        source: true,
        createdAt: true,
        lastSeen: true,
        emailVerifyExpires: true,
        emailVerifyToken: true,
        googleId: true,
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const rows = users.map((u) => {
      const expiresAt = u.emailVerifyExpires?.getTime() ?? null;
      let tokenStatus: "valid" | "expired" | "missing";
      if (!u.emailVerifyToken || !expiresAt) tokenStatus = "missing";
      else if (expiresAt < now) tokenStatus = "expired";
      else tokenStatus = "valid";

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        source: u.source,
        createdAt: u.createdAt.toISOString(),
        lastSeen: u.lastSeen.toISOString(),
        daysAgo: Math.floor((now - u.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
        tokenStatus,
        tokenExpiresAt: u.emailVerifyExpires?.toISOString() ?? null,
        hasGoogleId: Boolean(u.googleId),
        messagesSent: u._count.messages,
      };
    });

    return NextResponse.json({
      total: rows.length,
      users: rows,
    });
  } catch (err) {
    logError("ADMIN_OPS_UNVERIFIED", err, { route: "/api/admin/operations/unverified" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
