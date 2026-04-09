import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword } from "@/lib/password";
import { logError, logInfo } from "@/lib/logger";
import { verifyOrgToken } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

function getOrgAuth(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")?.trim();
  if (!token) return null;
  return verifyOrgToken(token);
}

/** GET — list admins in my organization */
export async function GET(req: NextRequest) {
  const auth = getOrgAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prisma = getPrismaClient();

    // Only org "admin" role can manage team
    const caller = await prisma.orgAdmin.findUnique({ where: { id: auth.adminId } });
    if (!caller || caller.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admins = await prisma.orgAdmin.findMany({
      where: { organizationId: caller.organizationId },
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ admins });
  } catch (error: unknown) {
    logError("ORG", error, { route: "GET /api/org/team" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** POST — create a new admin in my organization */
export async function POST(req: NextRequest) {
  const auth = getOrgAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prisma = getPrismaClient();

    const caller = await prisma.orgAdmin.findUnique({ where: { id: auth.adminId } });
    if (!caller || caller.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { email?: string; name?: string; password?: string; role?: string };
    if (!body.email?.trim() || !body.name?.trim() || !body.password?.trim()) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (body.password.trim().length < 8) {
      return NextResponse.json({ error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const existing = await prisma.orgAdmin.findUnique({
      where: { organizationId_email: { organizationId: caller.organizationId, email: body.email.trim() } },
    });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password.trim());
    const admin = await prisma.orgAdmin.create({
      data: {
        organizationId: caller.organizationId,
        email: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        role: body.role ?? "hr",
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    logInfo("ORG", "org_admin_created_self_service", { orgId: caller.organizationId, newAdminId: admin.id });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (error: unknown) {
    logError("ORG", error, { route: "POST /api/org/team" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** DELETE — remove an admin from my organization */
export async function DELETE(req: NextRequest) {
  const auth = getOrgAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prisma = getPrismaClient();

    const caller = await prisma.orgAdmin.findUnique({ where: { id: auth.adminId } });
    if (!caller || caller.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as { adminId?: string };
    if (!body.adminId) return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });

    // Prevent self-deletion
    if (body.adminId === caller.id) {
      return NextResponse.json({ error: "CANNOT_DELETE_SELF" }, { status: 400 });
    }

    const target = await prisma.orgAdmin.findFirst({
      where: { id: body.adminId, organizationId: caller.organizationId },
    });
    if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.orgAdmin.delete({ where: { id: body.adminId } });
    logInfo("ORG", "org_admin_removed_self_service", { orgId: caller.organizationId, removedId: body.adminId });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("ORG", error, { route: "DELETE /api/org/team" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
