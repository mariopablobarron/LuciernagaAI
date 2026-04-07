import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/password";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withRateLimit(async function POST(
  req: NextRequest,
  ctx: unknown,
) {
  const adminAuth = resolveAdminAuth(req);
  if (!adminAuth.authenticated) {
    const res = NextResponse.json(
      { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
      { status: 401 },
    );
    if (adminAuth.source === "invalid") clearAdminSessionCookie(res);
    return res;
  }

  try {
    const { id: organizationId } = await (ctx as RouteContext).params;
    const body = (await req.json()) as {
      email?: string;
      name?: string;
      role?: string;
      password?: string;
    };

    if (!body.email || !body.name || !body.password) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "email, name, and password are required." },
        { status: 400 },
      );
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Verify the organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Organization not found." },
        { status: 404 },
      );
    }

    // Check for duplicate email within org
    const existingAdmin = await prisma.orgAdmin.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: body.email,
        },
      },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "CONFLICT", message: "An admin with this email already exists in this organization." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(body.password);

    const admin = await prisma.orgAdmin.create({
      data: {
        organizationId,
        email: body.email,
        name: body.name,
        role: body.role ?? "hr",
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "create_org_admin" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to create org admin." },
      { status: 500 },
    );
  }
}, { limit: 20 });

export const DELETE = withRateLimit(async function DELETE(
  req: NextRequest,
  ctx: unknown,
) {
  const adminAuth = resolveAdminAuth(req);
  if (!adminAuth.authenticated) {
    const res = NextResponse.json(
      { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
      { status: 401 },
    );
    if (adminAuth.source === "invalid") clearAdminSessionCookie(res);
    return res;
  }

  try {
    const { id: organizationId } = await (ctx as RouteContext).params;
    const body = (await req.json()) as { adminId?: string };

    if (!body.adminId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "adminId is required." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Verify admin belongs to this org
    const admin = await prisma.orgAdmin.findFirst({
      where: {
        id: body.adminId,
        organizationId,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Admin not found in this organization." },
        { status: 404 },
      );
    }

    await prisma.orgAdmin.delete({
      where: { id: body.adminId },
    });

    return NextResponse.json({ success: true, message: "Org admin removed." });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "delete_org_admin" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to remove org admin." },
      { status: 500 },
    );
  }
}, { limit: 20 });
