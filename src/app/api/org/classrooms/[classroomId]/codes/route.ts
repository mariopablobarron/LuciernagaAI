import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classroomId: string }> };

// POST /api/org/classrooms/[classroomId]/codes — generate a new classroom code
export async function POST(req: NextRequest, ctx: unknown) {
  const orgId = req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId");
  const token = req.headers.get("x-org-token") ?? new URL(req.url).searchParams.get("token");
  if (!orgId || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { classroomId } = await (ctx as RouteContext).params;
    const body = (await req.json()) as {
      label?: string;
      maxUses?: number;
      expiresInDays?: number;
    };

    const prisma = getPrismaClient();

    // Verify the admin has access
    const admin = await prisma.orgAdmin.findFirst({
      where: { organizationId: orgId },
      select: { id: true, role: true, classroomId: true },
    });
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (admin.role === "teacher" && admin.classroomId !== classroomId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify classroom belongs to this org
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { organizationId: true, name: true },
    });
    if (!classroom || classroom.organizationId !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate human-friendly code: PREFIX-YEAR-RANDOM
    const prefix = classroom.name
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 4)
      .toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${prefix}-${year}-${random}`;

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const created = await prisma.classroomCode.create({
      data: {
        classroomId,
        code,
        label: body.label?.trim() || null,
        maxUses: body.maxUses ?? 0, // 0 = unlimited
        expiresAt,
        createdBy: admin.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    logError("ORG", err, { route: "POST /api/org/classrooms/[classroomId]/codes" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
