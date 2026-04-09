import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET — list invites for an organization */
export async function GET(req: NextRequest, ctx: unknown) {
  const auth = requireAdminPermission(req, "organizations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orgId } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    const invites = await prisma.orgInvite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "list_org_invites" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** POST — create a new invite link */
export async function POST(req: NextRequest, ctx: unknown) {
  const auth = requireAdminPermission(req, "organizations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orgId } = await (ctx as RouteContext).params;
    const body = await req.json() as {
      email?: string;
      role?: string;
      maxUses?: number;
      expiresInDays?: number;
    };

    const prisma = getPrismaClient();

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86400000)
      : new Date(Date.now() + 30 * 86400000); // default 30 days

    const invite = await prisma.orgInvite.create({
      data: {
        organizationId: orgId,
        email: body.email?.trim().toLowerCase() || null,
        role: body.role || null,
        maxUses: body.maxUses ?? 1,
        expiresAt,
        createdBy: auth.adminId ?? "unknown",
      },
    });

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/signup?org_invite=${invite.code}`;

    logInfo("ADMIN_ORGS", "invite_created", { orgId, inviteId: invite.id });
    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "create_org_invite" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** DELETE — revoke an invite */
export async function DELETE(req: NextRequest, ctx: unknown) {
  const auth = requireAdminPermission(req, "organizations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orgId } = await (ctx as RouteContext).params;
    const body = await req.json() as { inviteId?: string };

    if (!body.inviteId) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const invite = await prisma.orgInvite.findFirst({
      where: { id: body.inviteId, organizationId: orgId },
    });
    if (!invite) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.orgInvite.delete({ where: { id: body.inviteId } });
    logInfo("ADMIN_ORGS", "invite_revoked", { orgId, inviteId: body.inviteId });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "revoke_org_invite" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
