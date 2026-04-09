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

/** GET — list all admin users (superadmin only) */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "team");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ admins });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "GET /api/admin/team" });
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}

/** POST — create a new admin user (superadmin only) */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "team");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { email, name, password, role } = body as {
      email?: string;
      name?: string;
      password?: string;
      role?: SystemRole;
    };

    if (!email?.trim() || !name?.trim() || !password?.trim() || !role) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "INVALID_ROLE", validRoles: VALID_ROLES }, { status: 400 });
    }

    const prisma = getPrismaClient();

    const existing = await prisma.adminUser.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password.trim());
    const admin = await prisma.adminUser.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    logInfo("ADMIN", "admin_user_created", { adminId: admin.id, role, createdBy: auth.adminId });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "POST /api/admin/team" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
