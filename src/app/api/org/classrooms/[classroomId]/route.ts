import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { verifyOrgToken } from "@/lib/org-auth";
import { cache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classroomId: string }> };

// GET /api/org/classrooms/[classroomId] — teacher dashboard data
export async function GET(req: NextRequest, ctx: unknown) {
  const token = req.nextUrl.searchParams.get("token");
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!token || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verified = verifyOrgToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const { classroomId } = await (ctx as RouteContext).params;
    const prisma = getPrismaClient();

    // Verify admin belongs to this org
    const admin = await prisma.orgAdmin.findFirst({
      where: { organizationId: orgId, id: verified.adminId },
      select: { id: true, role: true, classroomId: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Teachers can only see their own classroom
    if (admin.role === "teacher" && admin.classroomId !== classroomId) {
      return NextResponse.json({ error: "No tienes acceso a esta clase" }, { status: 403 });
    }

    // Verify classroom belongs to this org
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, description: true, organizationId: true },
    });

    if (!classroom || classroom.organizationId !== orgId) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
    }

    // Cache student data for 30s (aggregation heavy with 2000 users)
    const data = await cache.get(`classroom:${classroomId}`, 30_000, async () => {
      const students = await prisma.user.findMany({
        where: { classroomId, isActive: true, deletedAt: null },
        select: {
          id: true, name: true, email: true, lastSeen: true,
          messageCount: true, createdAt: true,
          userState: {
            select: {
              state: true, primaryEmotion: true, progressTrend: true,
              riskLevel: true, crisisActive: true, transformationPhase: true,
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

      const codes = await prisma.classroomCode.findMany({
        where: { classroomId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, code: true, label: true, maxUses: true,
          usedCount: true, isActive: true, expiresAt: true, createdAt: true,
        },
      });

      const totalStudents = students.length;
      const activeLastWeek = students.filter(
        (s) => Date.now() - new Date(s.lastSeen).getTime() < 7 * 86400000,
      ).length;
      const inCrisis = students.filter((s) => s.userState?.crisisActive).length;
      const avgStreak = totalStudents > 0
        ? Math.round(students.reduce((sum, s) => sum + (s.streak?.currentDays ?? 0), 0) / totalStudents)
        : 0;

      return {
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
            ? Math.round((s.goals[0].actions.filter((a) => a.completed).length / Math.max(s.goals[0].actions.length, 1)) * 100)
            : 0,
          createdAt: s.createdAt.toISOString(),
        })),
        codes,
        stats: { totalStudents, activeLastWeek, inCrisis, avgStreak },
      };
    });

    return NextResponse.json({ classroom, ...data });
  } catch (err) {
    logError("ORG", err, { route: "GET /api/org/classrooms/[classroomId]" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
