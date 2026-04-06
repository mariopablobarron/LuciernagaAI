import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import type {
  ExerciseResponse,
  ExerciseStep,
  ExerciseType,
  JourneyCoachContext,
  JourneyMap,
  JourneyPhase,
  JourneyProgressSummary,
  ModuleWithExercises,
  UserExerciseStatus,
  UserJourneyStatus,
} from "@/domain/journeys/types";

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getActiveJourney(
  userId: string,
): Promise<JourneyProgressSummary | null> {
  const prisma = getPrismaClient();

  const userJourney = await prisma.userJourney.findFirst({
    where: { userId, status: "active" },
    include: {
      journey: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              exercises: { orderBy: { order: "asc" }, select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!userJourney) return null;

  const allExerciseIds = userJourney.journey.modules.flatMap((m) =>
    m.exercises.map((e) => e.id),
  );

  const completedExercises = await prisma.userExercise.count({
    where: {
      userId,
      exerciseId: { in: allExerciseIds },
      status: "completed",
    },
  });

  const totalExercises = allExerciseIds.length;

  // Find the first module with incomplete exercises
  const completedExerciseIds = new Set(
    (
      await prisma.userExercise.findMany({
        where: { userId, exerciseId: { in: allExerciseIds }, status: "completed" },
        select: { exerciseId: true },
      })
    ).map((e) => e.exerciseId),
  );

  let currentModule: JourneyProgressSummary["currentModule"] = null;
  let nextExercise: JourneyProgressSummary["nextExercise"] = null;
  let completedModules = 0;

  for (const mod of userJourney.journey.modules) {
    const modExerciseIds = mod.exercises.map((e) => e.id);
    const allDone = modExerciseIds.every((id) => completedExerciseIds.has(id));

    if (allDone) {
      completedModules++;
      continue;
    }

    if (!currentModule) {
      currentModule = { id: mod.id, title: mod.title, order: mod.order };

      // Find next exercise in this module
      const nextEx = await prisma.exercise.findFirst({
        where: {
          moduleId: mod.id,
          id: { notIn: Array.from(completedExerciseIds) },
        },
        orderBy: { order: "asc" },
        select: { id: true, title: true, type: true, estimatedMinutes: true },
      });

      if (nextEx) {
        nextExercise = {
          id: nextEx.id,
          title: nextEx.title,
          type: nextEx.type as ExerciseType,
          estimatedMinutes: nextEx.estimatedMinutes,
        };
      }
    }
  }

  return {
    journeyId: userJourney.journeyId,
    journeyTitle: userJourney.journey.title,
    journeyPhase: userJourney.journey.phase as JourneyPhase,
    status: userJourney.status as UserJourneyStatus,
    progress: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
    totalModules: userJourney.journey.modules.length,
    completedModules,
    totalExercises,
    completedExercises,
    currentModule,
    nextExercise,
  };
}

export async function getJourneyMap(
  userId: string,
  journeyId: string,
): Promise<JourneyMap | null> {
  const prisma = getPrismaClient();

  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          exercises: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!journey) return null;

  const userJourney = await prisma.userJourney.findUnique({
    where: { userId_journeyId: { userId, journeyId } },
  });

  // Get all user exercise statuses
  const allExerciseIds = journey.modules.flatMap((m) =>
    m.exercises.map((e) => e.id),
  );

  const userExercises = await prisma.userExercise.findMany({
    where: { userId, exerciseId: { in: allExerciseIds } },
    select: { exerciseId: true, status: true },
  });

  const exerciseStatusMap = new Map(
    userExercises.map((ue) => [ue.exerciseId, ue.status as UserExerciseStatus]),
  );

  // Build module map with unlock logic
  const completedModuleIds = new Set<string>();
  const modules: ModuleWithExercises[] = [];

  for (const mod of journey.modules) {
    const exercises = mod.exercises.map((ex) => ({
      id: ex.id,
      slug: ex.slug,
      title: ex.title,
      type: ex.type as ExerciseType,
      estimatedMinutes: ex.estimatedMinutes,
      status: exerciseStatusMap.get(ex.id) ?? ("pending" as UserExerciseStatus),
    }));

    const completedCount = exercises.filter((e) => e.status === "completed").length;
    const isCompleted = completedCount === exercises.length && exercises.length > 0;
    if (isCompleted) completedModuleIds.add(mod.id);

    const unlocked =
      !mod.unlockAfterModuleId ||
      completedModuleIds.has(mod.unlockAfterModuleId);

    modules.push({
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      iconEmoji: mod.iconEmoji,
      unlocked,
      exercises,
      completedCount,
      totalCount: exercises.length,
    });
  }

  const totalExercises = allExerciseIds.length;
  const completedExercises = userExercises.filter(
    (ue) => ue.status === "completed",
  ).length;

  return {
    id: journey.id,
    slug: journey.slug,
    title: journey.title,
    description: journey.description,
    phase: journey.phase as JourneyPhase,
    iconEmoji: journey.iconEmoji,
    progress: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
    status: (userJourney?.status as UserJourneyStatus) ?? "active",
    modules,
  };
}

export async function getExerciseDetail(
  userId: string,
  exerciseId: string,
): Promise<{
  id: string;
  title: string;
  description: string;
  type: ExerciseType;
  estimatedMinutes: number;
  instructions: ExerciseStep[];
  debrief: string | null;
  tags: string[];
  moduleName: string;
  journeyName: string;
  status: UserExerciseStatus;
  responses: ExerciseResponse[] | null;
  reflection: string | null;
  aiDebrief: string | null;
} | null> {
  const prisma = getPrismaClient();

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      module: {
        include: { journey: { select: { title: true } } },
      },
    },
  });

  if (!exercise) return null;

  const userExercise = await prisma.userExercise.findUnique({
    where: { userId_exerciseId: { userId, exerciseId } },
  });

  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    type: exercise.type as ExerciseType,
    estimatedMinutes: exercise.estimatedMinutes,
    instructions: exercise.instructions as ExerciseStep[],
    debrief: exercise.debrief,
    tags: exercise.tags,
    moduleName: exercise.module.title,
    journeyName: exercise.module.journey.title,
    status: (userExercise?.status as UserExerciseStatus) ?? "pending",
    responses: (userExercise?.responses as ExerciseResponse[] | null) ?? null,
    reflection: userExercise?.reflection ?? null,
    aiDebrief: userExercise?.aiDebrief ?? null,
  };
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export async function assignJourneyToUser(
  userId: string,
  journeySlugOrId?: string,
): Promise<JourneyProgressSummary | null> {
  const prisma = getPrismaClient();

  // If no journey specified, pick the first active one by order
  const journey = journeySlugOrId
    ? await prisma.journey.findFirst({
        where: {
          OR: [{ id: journeySlugOrId }, { slug: journeySlugOrId }],
          isActive: true,
        },
      })
    : await prisma.journey.findFirst({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

  if (!journey) return null;

  // Check existing enrollment
  const existing = await prisma.userJourney.findUnique({
    where: { userId_journeyId: { userId, journeyId: journey.id } },
  });

  if (existing) {
    // Reactivate if paused/abandoned
    if (existing.status !== "active" && existing.status !== "completed") {
      await prisma.userJourney.update({
        where: { id: existing.id },
        data: { status: "active", updatedAt: new Date() },
      });
    }
    return getActiveJourney(userId);
  }

  // Pause any other active journeys
  await prisma.userJourney.updateMany({
    where: { userId, status: "active" },
    data: { status: "paused" },
  });

  const firstModule = await prisma.journeyModule.findFirst({
    where: { journeyId: journey.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  await prisma.userJourney.create({
    data: {
      userId,
      journeyId: journey.id,
      status: "active",
      currentModuleId: firstModule?.id ?? null,
      progress: 0,
    },
  });

  logInfo("JOURNEY", "journey_assigned", {
    userId,
    journeyId: journey.id,
    journeySlug: journey.slug,
  });

  return getActiveJourney(userId);
}

export async function startExercise(
  userId: string,
  exerciseId: string,
): Promise<{ success: boolean }> {
  const prisma = getPrismaClient();

  await prisma.userExercise.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: {
      userId,
      exerciseId,
      status: "in_progress",
      startedAt: new Date(),
    },
    update: {
      status: "in_progress",
      startedAt: new Date(),
    },
  });

  logInfo("JOURNEY", "exercise_started", { userId, exerciseId });
  return { success: true };
}

export async function completeExercise(
  userId: string,
  exerciseId: string,
  data: {
    responses?: ExerciseResponse[];
    reflection?: string;
  },
): Promise<{ success: boolean; progress: number }> {
  const prisma = getPrismaClient();

  const now = new Date();

  await prisma.userExercise.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: {
      userId,
      exerciseId,
      status: "completed",
      responses: data.responses ?? [],
      reflection: data.reflection ?? null,
      startedAt: now,
      completedAt: now,
    },
    update: {
      status: "completed",
      responses: data.responses ?? undefined,
      reflection: data.reflection ?? undefined,
      completedAt: now,
    },
  });

  logInfo("JOURNEY", "exercise_completed", { userId, exerciseId });

  // Recalculate journey progress
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { module: { select: { journeyId: true } } },
  });

  if (!exercise) return { success: true, progress: 0 };

  const journeyId = exercise.module.journeyId;
  const allExIds = (
    await prisma.exercise.findMany({
      where: { module: { journeyId } },
      select: { id: true },
    })
  ).map((e) => e.id);

  const completedCount = await prisma.userExercise.count({
    where: { userId, exerciseId: { in: allExIds }, status: "completed" },
  });

  const progress =
    allExIds.length > 0 ? Math.round((completedCount / allExIds.length) * 100) : 0;

  const isComplete = completedCount === allExIds.length;

  await prisma.userJourney.updateMany({
    where: { userId, journeyId, status: "active" },
    data: {
      progress,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? now : undefined,
      updatedAt: now,
    },
  });

  return { success: true, progress };
}

export async function skipExercise(
  userId: string,
  exerciseId: string,
): Promise<{ success: boolean }> {
  const prisma = getPrismaClient();

  await prisma.userExercise.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, status: "skipped" },
    update: { status: "skipped" },
  });

  logInfo("JOURNEY", "exercise_skipped", { userId, exerciseId });
  return { success: true };
}

// ─── Available Journeys ───────────────────────────────────────────────────────

export async function listAvailableJourneys(userId: string): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    phase: JourneyPhase;
    iconEmoji: string;
    durationWeeks: number;
    moduleCount: number;
    exerciseCount: number;
    enrolled: boolean;
    userProgress: number | null;
    userStatus: UserJourneyStatus | null;
  }>
> {
  const prisma = getPrismaClient();

  const journeys = await prisma.journey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        include: {
          exercises: { select: { id: true } },
        },
      },
      userJourneys: {
        where: { userId },
        select: { progress: true, status: true },
      },
    },
  });

  return journeys.map((j) => {
    const uj = j.userJourneys[0] ?? null;
    return {
      id: j.id,
      slug: j.slug,
      title: j.title,
      description: j.description,
      phase: j.phase as JourneyPhase,
      iconEmoji: j.iconEmoji,
      durationWeeks: j.durationWeeks,
      moduleCount: j.modules.length,
      exerciseCount: j.modules.reduce((sum, m) => sum + m.exercises.length, 0),
      enrolled: uj !== null,
      userProgress: uj?.progress ?? null,
      userStatus: (uj?.status as UserJourneyStatus) ?? null,
    };
  });
}

// ─── Coach Integration ────────────────────────────────────────────────────────

/**
 * Build journey context for injection into the coach system prompt.
 * This is the ONLY integration point with processMessage.
 */
export async function getJourneyCoachContext(
  userId: string,
): Promise<JourneyCoachContext | null> {
  const prisma = getPrismaClient();

  const userJourney = await prisma.userJourney.findFirst({
    where: { userId, status: "active" },
    include: { journey: { select: { title: true, phase: true } } },
  });

  if (!userJourney) return null;

  const activeJourney = await getActiveJourney(userId);
  if (!activeJourney) return null;

  // Get last completed exercise
  const lastCompleted = await prisma.userExercise.findFirst({
    where: { userId, status: "completed" },
    orderBy: { completedAt: "desc" },
    include: {
      exercise: { select: { title: true, type: true } },
    },
  });

  return {
    activeJourney: userJourney.journey.title,
    currentPhase: userJourney.journey.phase as JourneyPhase,
    currentModule: activeJourney.currentModule?.title ?? "Sin módulo activo",
    progress: activeJourney.progress,
    lastExercise: lastCompleted
      ? {
          title: lastCompleted.exercise.title,
          type: lastCompleted.exercise.type as ExerciseType,
          reflection: lastCompleted.reflection,
          completedAt: lastCompleted.completedAt?.toISOString() ?? "",
        }
      : null,
    nextExercise: activeJourney.nextExercise
      ? {
          title: activeJourney.nextExercise.title,
          type: activeJourney.nextExercise.type as ExerciseType,
        }
      : null,
    exercisesCompletedTotal: activeJourney.completedExercises,
  };
}
