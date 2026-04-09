import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET — list users in an organization */
export async function GET(req: NextRequest, ctx: unknown) {
  const auth = requireAdminPermission(req, "organizations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orgId } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, email: true, name: true, isActive: true,
        lastSeen: true, createdAt: true, messageCount: true,
        userState: { select: { state: true, riskLevel: true, crisisActive: true } },
        streak: { select: { currentDays: true } },
        subscriptions: { where: { status: "active" }, select: { plan: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      lastSeen: u.lastSeen.toISOString(),
      createdAt: u.createdAt.toISOString(),
      messageCount: u.messageCount,
      state: u.userState?.state ?? "neutral",
      riskLevel: u.userState?.riskLevel ?? "low",
      crisisActive: u.userState?.crisisActive ?? false,
      streakDays: u.streak?.currentDays ?? 0,
      plan: u.subscriptions[0]?.plan ?? "free",
    }));

    return NextResponse.json({ users: items, total: items.length, maxUsers: org.maxUsers });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "list_org_users" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** POST — assign existing user(s) to this organization */
export async function POST(req: NextRequest, ctx: unknown) {
  const auth = requireAdminPermission(req, "organizations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orgId } = await (ctx as RouteContext).params;
    const body = await req.json() as { userIds?: string[]; email?: string };
    const prisma = getPrismaClient();

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Check seat limit
    const currentCount = await prisma.user.count({ where: { organizationId: orgId } });

    // Assign by userIds array
    if (body.userIds?.length) {
      if (currentCount + body.userIds.length > org.maxUsers) {
        return NextResponse.json({
          error: "SEAT_LIMIT",
          message: `La organizacion tiene ${currentCount}/${org.maxUsers} usuarios. No caben ${body.userIds.length} mas.`,
        }, { status: 400 });
      }

      await prisma.user.updateMany({
        where: { id: { in: body.userIds }, organizationId: null },
        data: { organizationId: orgId },
      });

      logInfo("ADMIN_ORGS", "users_assigned", { orgId, count: body.userIds.length });
      return NextResponse.json({ ok: true, assigned: body.userIds.length });
    }

    // Assign by email
    if (body.email?.trim()) {
      if (currentCount >= org.maxUsers) {
        return NextResponse.json({ error: "SEAT_LIMIT", message: "Organizacion llena." }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { email: body.email.trim() } });
      if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
      if (user.organizationId) {
        return NextResponse.json({ error: "ALREADY_ASSIGNED", message: "El usuario ya pertenece a una organizacion." }, { status: 409 });
      }

      await prisma.user.update({ where: { id: user.id }, data: { organizationId: orgId } });
      logInfo("ADMIN_ORGS", "user_assigned", { orgId, userId: user.id });
      return NextResponse.json({ ok: true, assigned: 1, userId: user.id });
    }

    return NextResponse.json({ error: "MISSING_FIELDS", message: "Envía userIds o email." }, { status: 400 });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "assign_org_users" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** DELETE — unassign a user from this organization */
export async function DELETE(req: NextRequest, ctx: unknown) {
  const auth = requireAdminPermission(req, "organizations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orgId } = await (ctx as RouteContext).params;
    const body = await req.json() as { userId?: string };

    if (!body.userId) {
      return NextResponse.json({ error: "MISSING_FIELDS", message: "userId requerido." }, { status: 400 });
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findFirst({
      where: { id: body.userId, organizationId: orgId },
    });
    if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.user.update({ where: { id: body.userId }, data: { organizationId: null } });
    logInfo("ADMIN_ORGS", "user_unassigned", { orgId, userId: body.userId });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "unassign_org_user" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
