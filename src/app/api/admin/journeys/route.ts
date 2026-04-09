import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const adminAuth = requireAdminPermission(req, "journeys");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const prisma = getPrismaClient();

    // ── 1. Overview ──────────────────────────────────────────────────────────
    const [journeys, userJourneys] = await Promise.all([
      prisma.journey.findMany({
        select: { id: true, title: true, phase: true },
      }),
      prisma.userJourney.findMany({
        select: { journeyId: true, status: true, progress: true },
      }),
    ]);

    const totalJourneys = journeys.length;
    const totalEnrollments = userJourneys.length;
    const activeEnrollments = userJourneys.filter((uj) => uj.status === "active").length;
    const completedEnrollments = userJourneys.filter((uj) => uj.status === "completed").length;
    const abandonedEnrollments = userJourneys.filter((uj) => uj.status === "abandoned").length;
    const avgProgress =
      totalEnrollments > 0
        ? userJourneys.reduce((sum, uj) => sum + uj.progress, 0) / totalEnrollments
        : 0;

    const overview = {
      totalJourneys,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      abandonedEnrollments,
      avgProgress: Math.round(avgProgress * 100) / 100,
    };

    // ── 2. By Journey ────────────────────────────────────────────────────────
    const journeyMap = new Map(journeys.map((j) => [j.id, j]));
    const byJourneyMap = new Map<
      string,
      { enrolled: number; active: number; completed: number; abandoned: number; totalProgress: number }
    >();

    for (const uj of userJourneys) {
      const entry = byJourneyMap.get(uj.journeyId) ?? {
        enrolled: 0,
        active: 0,
        completed: 0,
        abandoned: 0,
        totalProgress: 0,
      };
      entry.enrolled += 1;
      entry.totalProgress += uj.progress;
      if (uj.status === "active") entry.active += 1;
      else if (uj.status === "completed") entry.completed += 1;
      else if (uj.status === "abandoned") entry.abandoned += 1;
      byJourneyMap.set(uj.journeyId, entry);
    }

    const byJourney = Array.from(byJourneyMap.entries())
      .map(([journeyId, stats]) => {
        const journey = journeyMap.get(journeyId);
        return {
          journeyId,
          title: journey?.title ?? "Unknown",
          phase: journey?.phase ?? "unknown",
          enrolled: stats.enrolled,
          active: stats.active,
          completed: stats.completed,
          abandoned: stats.abandoned,
          avgProgress:
            stats.enrolled > 0
              ? Math.round((stats.totalProgress / stats.enrolled) * 100) / 100
              : 0,
        };
      })
      .sort((a, b) => b.enrolled - a.enrolled);

    // ── 3. By Module ─────────────────────────────────────────────────────────
    const modules = await prisma.journeyModule.findMany({
      select: {
        id: true,
        title: true,
        journeyId: true,
        exercises: {
          select: {
            id: true,
            userExercises: {
              where: { status: "completed" },
              select: { rating: true },
            },
          },
        },
      },
    });

    const byModuleRaw = modules.map((mod) => {
      const journey = journeyMap.get(mod.journeyId);
      let completedExercises = 0;
      let ratingSum = 0;
      let ratingCount = 0;

      for (const exercise of mod.exercises) {
        completedExercises += exercise.userExercises.length;
        for (const ue of exercise.userExercises) {
          if (ue.rating != null) {
            ratingSum += ue.rating;
            ratingCount += 1;
          }
        }
      }

      return {
        moduleId: mod.id,
        title: mod.title,
        journeyTitle: journey?.title ?? "Unknown",
        exerciseCount: mod.exercises.length,
        completedExercises,
        avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : null,
      };
    });

    const byModule = byModuleRaw
      .sort((a, b) => b.completedExercises - a.completedExercises)
      .slice(0, 20);

    // ── 4. Friction Points ───────────────────────────────────────────────────
    const exercises = await prisma.exercise.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        module: {
          select: {
            title: true,
            journey: { select: { title: true } },
          },
        },
        userExercises: {
          select: { status: true },
        },
      },
    });

    const frictionPoints = exercises
      .map((ex) => {
        const started = ex.userExercises.filter(
          (ue) => ue.status !== "pending"
        ).length;
        const completed = ex.userExercises.filter(
          (ue) => ue.status === "completed"
        ).length;
        const skipped = ex.userExercises.filter(
          (ue) => ue.status === "skipped"
        ).length;
        const completionRate = started > 0 ? completed / started : 1;

        return {
          exerciseId: ex.id,
          title: ex.title,
          type: ex.type,
          moduleName: ex.module.title,
          journeyTitle: ex.module.journey.title,
          started,
          completed,
          skipped,
          completionRate: Math.round(completionRate * 10000) / 10000,
        };
      })
      .filter((ex) => ex.started > 0)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 10);

    // ── 5. Recent Activity ───────────────────────────────────────────────────
    const recentCompletions = await prisma.userExercise.findMany({
      where: { status: "completed", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        user: { select: { email: true } },
        exercise: { select: { title: true } },
        rating: true,
        completedAt: true,
      },
    });

    const recentActivity = recentCompletions.map((ue) => ({
      userEmail: ue.user.email,
      exerciseTitle: ue.exercise.title,
      rating: ue.rating,
      completedAt: ue.completedAt,
    }));

    return NextResponse.json({
      overview,
      byJourney,
      byModule,
      frictionPoints,
      recentActivity,
    });
  } catch (error: unknown) {
    logError("JOURNEYS_ADMIN", error, { route: "/api/admin/journeys" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}, { limit: 30 });
