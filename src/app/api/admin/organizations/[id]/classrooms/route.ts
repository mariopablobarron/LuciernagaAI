import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/organizations/[id]/classrooms — list classrooms
export const GET = withRateLimit(async function GET(
  req: NextRequest,
  ctx: unknown,
) {
  const adminAuth = requireAdminPermission(req, "organizations");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const { id: organizationId } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    const classrooms = await prisma.classroom.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, codes: true } },
        teachers: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      classrooms: classrooms.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        isActive: c.isActive,
        teacherId: c.teacherId,
        teachers: c.teachers,
        userCount: c._count.users,
        codeCount: c._count.codes,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logError("ADMIN", err, { route: "GET /api/admin/organizations/[id]/classrooms" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}, { limit: 30 });

// POST /api/admin/organizations/[id]/classrooms — create classroom
export const POST = withRateLimit(async function POST(
  req: NextRequest,
  ctx: unknown,
) {
  const adminAuth = requireAdminPermission(req, "organizations");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const { id: organizationId } = await (ctx as RouteContext).params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      teacherId?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "El nombre del aula es obligatorio." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    const classroom = await prisma.classroom.create({
      data: {
        organizationId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        teacherId: body.teacherId || null,
      },
    });

    // If teacherId provided, link the OrgAdmin to this classroom
    if (body.teacherId) {
      await prisma.orgAdmin.update({
        where: { id: body.teacherId },
        data: { classroomId: classroom.id },
      }).catch(() => null);
    }

    return NextResponse.json(classroom, { status: 201 });
  } catch (err) {
    logError("ADMIN", err, { route: "POST /api/admin/organizations/[id]/classrooms" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}, { limit: 20 });
