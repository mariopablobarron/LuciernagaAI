import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classroomId: string }> };

function getOrgAuth(req: NextRequest) {
  const token = req.headers.get("x-org-token") ?? new URL(req.url).searchParams.get("token");
  const orgId = req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId");
  return { token, orgId };
}

// GET /api/org/classrooms/[classroomId] — teacher dashboard data
export async function GET(req: NextRequest, ctx: unknown) {
  const { token, orgId } = getOrgAuth(req);
  if (!token || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { classroomId } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    // Verify org admin
    const admin = await prisma.orgAdmin.findFirst({
      where: { organizationId: orgId, passwordHash: { not: "" } },
      select: { id: true, role: true, classroomId: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Teachers can only see their own classroom
    if (admin.role === "teacher" && admin.classroomId !== classroomId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, description: true, organizationId: true },
    });

    if (!classroom || classroom.organizationId !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get students with their progress
    const students = await prisma.user.findMany({
      where: { classroomId, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        lastSeen: true,
        messageCount: true,
        createdAt: true,
        userState: {
          select: {
            state: true,
            primaryEmotion: true,
            progressTrend: true,
            riskLevel: true,
            crisisActive: true,
            transformationPhase: true,
          },
        },
        streak: { select: { currentDays: true, bestDays: true } },
        goals: {
          where: { status: "active" },
          select: { id: true, title: true, actions: { select: { completed: true } } },
          take: 1,
        },
      },
      orderBy: { lastSeen: "desc" },
    });

    // Get codes for this classroom
    const codes = await prisma.classroomCode.findMany({
      where: { classroomId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        label: true,
        maxUses: true,
        usedCount: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Aggregate stats
    const totalStudents = students.length;
    const activeLastWeek = students.filter(
      (s) => Date.now() - new Date(s.lastSeen).getTime() < 7 * 24 * 60 * 60 * 1000,
    ).length;
    const inCrisis = students.filter((s) => s.userState?.crisisActive).length;
    const avgStreak = totalStudents > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.streak?.currentDays ?? 0), 0) / totalStudents)
      : 0;

    return NextResponse.json({
      classroom,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        lastSeen: s.lastSeen.toISOString(),
        messageCount: s.messageCount,
        state: s.userState?.state ?? "neutral",
        primaryEmotion: s.userState?.primaryEmotion ?? "calma",
        progressTrend: s.userState?.progressTrend ?? "igual",
        riskLevel: s.userState?.riskLevel ?? "low",
        crisisActive: s.userState?.crisisActive ?? false,
        transformationPhase: s.userState?.transformationPhase ?? "bloqueo",
        streakDays: s.streak?.currentDays ?? 0,
        bestStreak: s.streak?.bestDays ?? 0,
        activeGoal: s.goals[0]?.title ?? null,
        goalProgress: s.goals[0]
          ? Math.round(
              (s.goals[0].actions.filter((a) => a.completed).length /
                Math.max(s.goals[0].actions.length, 1)) *
                100,
            )
          : 0,
        createdAt: s.createdAt.toISOString(),
      })),
      codes,
      stats: { totalStudents, activeLastWeek, inCrisis, avgStreak },
    });
  } catch (err) {
    logError("ORG", err, { route: "GET /api/org/classrooms/[classroomId]" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
