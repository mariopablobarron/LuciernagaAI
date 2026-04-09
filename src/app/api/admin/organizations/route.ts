import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "organizations");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const prisma = getPrismaClient();

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            orgAdmins: true,
            users: true,
          },
        },
      },
    });

    const result = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      plan: org.plan,
      maxUsers: org.maxUsers,
      isActive: org.isActive,
      contactEmail: org.contactEmail,
      createdAt: org.createdAt.toISOString(),
      adminCount: org._count.orgAdmins,
      userCount: org._count.users,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "list_organizations" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to load organizations." },
      { status: 500 },
    );
  }
}, { limit: 30 });

export const POST = withRateLimit(async function POST(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "organizations");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const body = (await req.json()) as {
      name?: string;
      slug?: string;
      type?: string;
      plan?: string;
      maxUsers?: number;
      contactName?: string;
      contactEmail?: string;
    };

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "name and slug are required." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    const existing = await prisma.organization.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "CONFLICT", message: "An organization with this slug already exists." },
        { status: 409 },
      );
    }

    const org = await prisma.organization.create({
      data: {
        name: body.name,
        slug: body.slug,
        type: body.type ?? "company",
        plan: body.plan ?? "team",
        maxUsers: body.maxUsers ?? 50,
        contactName: body.contactName ?? null,
        contactEmail: body.contactEmail ?? null,
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error: unknown) {
    logError("ADMIN_ORGS", error, { action: "create_organization" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to create organization." },
      { status: 500 },
    );
  }
}, { limit: 20 });
