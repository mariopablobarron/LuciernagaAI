import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword } from "@/lib/password";
import { logError, logInfo } from "@/lib/logger";
import type { SystemRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_ROLES: SystemRole[] = [
  "superadmin", "admin", "clinical", "marketing", "support", "content", "ops",
];

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH — update an admin user (superadmin only) */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = requireAdminPermission(req, "team");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, email, role, isActive, password } = body as {
      name?: string;
      email?: string;
      role?: SystemRole;
      isActive?: boolean;
      password?: string;
    };

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "INVALID_ROLE", validRoles: VALID_ROLES }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name?.trim()) data.name = name.trim();
    if (email?.trim()) data.email = email.trim().toLowerCase();
    if (role) data.role = role;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password?.trim()) data.passwordHash = await hashPassword(password.trim());

    const updated = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });

    logInfo("ADMIN", "admin_user_updated", { adminId: id, changes: Object.keys(data), updatedBy: auth.adminId });
    return NextResponse.json({ admin: updated });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: `PATCH /api/admin/team/${id}` });
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}

/** DELETE — remove an admin user (superadmin only) */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = requireAdminPermission(req, "team");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const prisma = getPrismaClient();
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.adminUser.delete({ where: { id } });
    logInfo("ADMIN", "admin_user_deleted", { adminId: id, deletedBy: auth.adminId });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: `DELETE /api/admin/team/${id}` });
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
