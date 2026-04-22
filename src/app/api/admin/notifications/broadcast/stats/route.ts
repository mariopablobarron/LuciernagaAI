import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "notifications");
  if (auth instanceof NextResponse) return auth;

  const prisma = getPrismaClient();

  const [subscribedUsers, activeUsers] = await Promise.all([
    prisma.pushSubscription
      .findMany({ select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  return NextResponse.json({ subscribedUsers, activeUsers });
}, { limit: 30 });
