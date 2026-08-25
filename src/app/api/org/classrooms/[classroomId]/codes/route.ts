import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { verifyOrgToken } from "@/lib/org-auth";
import { cache } from "@/lib/cache";
import { canManageClassroomCodes } from "@/lib/org-classroom-access";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classroomId: string }> };

// POST /api/org/classrooms/[classroomId]/codes — generate a new classroom code
export async function POST(req: NextRequest, ctx: unknown) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  const token = req.nextUrl.searchParams.get("token");
  if (!orgId || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verified = verifyOrgToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const { classroomId } = await (ctx as RouteContext).params;
    const body = (await req.json()) as {
      label?: string;
      maxUses?: number;
      expiresInDays?: number;
    };

    const prisma = getPrismaClient();

    // Verify admin has access
    const admin = await prisma.orgAdmin.findFirst({
      where: { organizationId: orgId, id: verified.adminId },
      select: { id: true, role: true, classroomId: true },
    });
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageClassroomCodes(admin, classroomId)) {
      return NextResponse.json({ error: "No tienes acceso a esta clase" }, { status: 403 });
    }

    // Verify classroom belongs to this org
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { organizationId: true, name: true },
    });
    if (!classroom || classroom.organizationId !== orgId) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
    }

    // Generate human-friendly code
    const prefix = classroom.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "AULA";
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${prefix}-${year}-${random}`;

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86400000)
      : null;

    const created = await prisma.classroomCode.create({
      data: {
        classroomId,
        code,
        label: body.label?.trim() || null,
        maxUses: body.maxUses ?? 0,
        expiresAt,
        createdBy: admin.id,
      },
    });

    // Invalidate classroom cache so codes appear immediately
    cache.invalidate(`classroom:${classroomId}`);

    audit({
      actorId: admin.id,
      actorType: "orgAdmin",
      action: "create",
      resource: "ClassroomCode",
      resourceId: created.id,
      metadata: { organizationId: orgId, classroomId, role: admin.role },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    logError("ORG", err, { route: "POST /api/org/classrooms/[classroomId]/codes" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
