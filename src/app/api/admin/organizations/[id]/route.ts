import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(async function GET(
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
    const { id } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        orgAdmins: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            lastLoginAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastSeen: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        },
        _count: {
          select: {
            orgAdmins: true,
            users: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Organization not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      plan: org.plan,
      maxUsers: org.maxUsers,
      isActive: org.isActive,
      contactName: org.contactName,
      contactEmail: org.contactEmail,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      adminCount: org._count.orgAdmins,
      userCount: org._count.users,
      admins: org.orgAdmins,
      users: org.users,
    });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "get_organization" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to load organization." },
      { status: 500 },
    );
  }
}, { limit: 30 });

export const PATCH = withRateLimit(async function PATCH(
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
    const { id } = await (ctx as RouteContext).params;
    const body = (await req.json()) as {
      name?: string;
      slug?: string;
      type?: string;
      plan?: string;
      maxUsers?: number;
      isActive?: boolean;
      contactName?: string;
      contactEmail?: string;
    };

    const prisma = getPrismaClient();

    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Organization not found." },
        { status: 404 },
      );
    }

    // If slug is being changed, check for conflicts
    if (body.slug && body.slug !== existing.slug) {
      const slugConflict = await prisma.organization.findUnique({
        where: { slug: body.slug },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: "CONFLICT", message: "An organization with this slug already exists." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.plan !== undefined && { plan: body.plan }),
        ...(body.maxUsers !== undefined && { maxUsers: body.maxUsers }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.contactName !== undefined && { contactName: body.contactName }),
        ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "update_organization" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to update organization." },
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
    const { id } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Organization not found." },
        { status: 404 },
      );
    }

    // Soft delete: set isActive to false
    await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Organization deactivated." });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "delete_organization" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to deactivate organization." },
      { status: 500 },
    );
  }
}, { limit: 20 });
