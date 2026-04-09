import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import type {
  ProjectPhase,
  ProjectCoachContext,
  ProjectProgressSummary,
} from "@/domain/projects/types";
import { PHASE_PROMPTS } from "@/domain/projects/types";

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getActiveProject(
  userId: string,
): Promise<ProjectProgressSummary | null> {
  const prisma = getPrismaClient();

  const project = await prisma.personalProject.findFirst({
    where: { userId, status: "active" },
    include: {
      focusAreas: {
        where: { status: "active" },
        include: {
          steps: { select: { id: true, completed: true } },
        },
      },
      reflections: { select: { id: true } },
      insights: { select: { id: true, acknowledged: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!project) return null;

  const allSteps = project.focusAreas.flatMap((fa) => fa.steps);
  const completedSteps = allSteps.filter((s) => s.completed).length;

  const daysActive = Math.max(
    1,
    Math.ceil(
      (Date.now() - project.startedAt.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  return {
    projectId: project.id,
    title: project.title,
    phase: project.phase as ProjectPhase,
    status: project.status as ProjectProgressSummary["status"],
    focusAreaCount: project.focusAreas.length,
    completedSteps,
    totalSteps: allSteps.length,
    reflectionCount: project.reflections.length,
    insightCount: project.insights.length,
    unacknowledgedInsights: project.insights.filter((i) => !i.acknowledged)
      .length,
    daysActive,
  };
}

export async function getProjectDetail(
  userId: string,
  projectId: string,
) {
  const prisma = getPrismaClient();

  const project = await prisma.personalProject.findFirst({
    where: { id: projectId, userId },
    include: {
      phaseEntries: { orderBy: { order: "asc" } },
      focusAreas: {
        orderBy: { priority: "asc" },
        include: {
          steps: { orderBy: { order: "asc" } },
        },
      },
      reflections: { orderBy: { createdAt: "desc" } },
      insights: { orderBy: { createdAt: "desc" } },
    },
  });

  return project;
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export async function createProject(
  userId: string,
  title: string,
  description?: string,
) {
  const prisma = getPrismaClient();

  // Pause any active project
  await prisma.personalProject.updateMany({
    where: { userId, status: "active" },
    data: { status: "paused" },
  });

  const project = await prisma.personalProject.create({
    data: {
      userId,
      title,
      description: description ?? null,
      phase: "feel",
      status: "active",
    },
  });

  // Create initial phase entries from FEEL prompts
  const feelPrompts = PHASE_PROMPTS.feel;
  await prisma.projectPhaseEntry.createMany({
    data: feelPrompts.map((prompt, index) => ({
      projectId: project.id,
      phase: "feel",
      promptKey: prompt.key,
      question: prompt.question,
      order: index,
      status: "pending",
    })),
  });

  return project;
}

export async function updateProjectPhase(
  userId: string,
  projectId: string,
  newPhase: ProjectPhase,
) {
  const prisma = getPrismaClient();

  const project = await prisma.personalProject.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) return null;

  const oldPhase = project.phase;

  // Update the project phase
  const updated = await prisma.personalProject.update({
    where: { id: projectId },
    data: { phase: newPhase },
  });

  // Create phase entries for the new phase
  const prompts = PHASE_PROMPTS[newPhase];
  await prisma.projectPhaseEntry.createMany({
    data: prompts.map((prompt, index) => ({
      projectId,
      phase: newPhase,
      promptKey: prompt.key,
      question: prompt.question,
      order: index,
      status: "pending",
    })),
  });

  // Create a phase_transition reflection
  await prisma.projectReflection.create({
    data: {
      projectId,
      phase: oldPhase,
      type: "phase_transition",
      content: `Transicion de fase: ${oldPhase} → ${newPhase}`,
    },
  });

  return updated;
}

export async function addPhaseEntryResponse(
  userId: string,
  entryId: string,
  response: string,
) {
  const prisma = getPrismaClient();

  // Verify ownership: entry -> project -> user
  const entry = await prisma.projectPhaseEntry.findUnique({
    where: { id: entryId },
    include: { project: { select: { userId: true } } },
  });

  if (!entry || entry.project.userId !== userId) return null;

  return prisma.projectPhaseEntry.update({
    where: { id: entryId },
    data: {
      response,
      status: "completed",
    },
  });
}

export async function addFocusArea(
  userId: string,
  projectId: string,
  title: string,
  description?: string,
) {
  const prisma = getPrismaClient();

  // Verify ownership
  const project = await prisma.personalProject.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) return null;

  return prisma.projectFocusArea.create({
    data: {
      projectId,
      title,
      description: description ?? null,
    },
  });
}

export async function addStep(
  userId: string,
  focusAreaId: string,
  description: string,
  dueDate?: Date,
) {
  const prisma = getPrismaClient();

  // Verify ownership: focusArea -> project -> user
  const focusArea = await prisma.projectFocusArea.findUnique({
    where: { id: focusAreaId },
    include: { project: { select: { userId: true } } },
  });

  if (!focusArea || focusArea.project.userId !== userId) return null;

  return prisma.projectStep.create({
    data: {
      focusAreaId,
      description,
      dueDate: dueDate ?? null,
    },
  });
}

export async function completeStep(
  userId: string,
  stepId: string,
  reflection?: string,
) {
  const prisma = getPrismaClient();

  // Verify ownership: step -> focusArea -> project -> user
  const step = await prisma.projectStep.findUnique({
    where: { id: stepId },
    include: {
      focusArea: {
        include: { project: { select: { userId: true } } },
      },
    },
  });

  if (!step || step.focusArea.project.userId !== userId) return null;

  return prisma.projectStep.update({
    where: { id: stepId },
    data: {
      completed: true,
      completedAt: new Date(),
      reflection: reflection ?? null,
    },
  });
}

export async function addReflection(
  userId: string,
  projectId: string,
  content: string,
  type: string,
  phase: string,
) {
  const prisma = getPrismaClient();

  // Verify ownership
  const project = await prisma.personalProject.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) return null;

  return prisma.projectReflection.create({
    data: {
      projectId,
      content,
      type,
      phase,
    },
  });
}

export async function addInsight(
  projectId: string,
  type: string,
  content: string,
  phase: string,
) {
  const prisma = getPrismaClient();

  return prisma.projectInsight.create({
    data: {
      projectId,
      type,
      content,
      phase,
    },
  });
}

export async function acknowledgeInsight(
  userId: string,
  insightId: string,
) {
  const prisma = getPrismaClient();

  // Verify ownership: insight -> project -> user
  const insight = await prisma.projectInsight.findUnique({
    where: { id: insightId },
    include: { project: { select: { userId: true } } },
  });

  if (!insight || insight.project.userId !== userId) return null;

  return prisma.projectInsight.update({
    where: { id: insightId },
    data: { acknowledged: true },
  });
}

export async function updateProjectStatus(
  userId: string,
  projectId: string,
  status: string,
) {
  const prisma = getPrismaClient();

  const project = await prisma.personalProject.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) return null;

  return prisma.personalProject.update({
    where: { id: projectId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : undefined,
    },
  });
}

export async function listUserProjects(userId: string) {
  const prisma = getPrismaClient();

  const projects = await prisma.personalProject.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      focusAreas: {
        include: {
          steps: { select: { id: true, completed: true } },
        },
      },
      reflections: { select: { id: true } },
      insights: { select: { id: true, acknowledged: true } },
    },
  });

  return projects.map((project) => {
    const allSteps = project.focusAreas.flatMap((fa) => fa.steps);
    const completedSteps = allSteps.filter((s) => s.completed).length;
    const daysActive = Math.max(
      1,
      Math.ceil(
        (Date.now() - project.startedAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    return {
      projectId: project.id,
      title: project.title,
      phase: project.phase as ProjectPhase,
      status: project.status,
      focusAreaCount: project.focusAreas.length,
      completedSteps,
      totalSteps: allSteps.length,
      reflectionCount: project.reflections.length,
      insightCount: project.insights.length,
      unacknowledgedInsights: project.insights.filter((i) => !i.acknowledged)
        .length,
      daysActive,
    };
  });
}

// ─── Coach Integration ────────────────────────────────────────────────────────

export async function getProjectCoachContext(
  userId: string,
): Promise<ProjectCoachContext | null> {
  const prisma = getPrismaClient();

  const project = await prisma.personalProject.findFirst({
    where: { userId, status: "active" },
    include: {
      focusAreas: {
        where: { status: "active" },
        include: {
          steps: { select: { id: true, completed: true } },
        },
      },
      reflections: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      insights: {
        where: { acknowledged: false },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!project) return null;

  const allSteps = project.focusAreas.flatMap((fa) => fa.steps);
  const completedSteps = allSteps.filter((s) => s.completed).length;
  const daysActive = Math.max(
    1,
    Math.ceil(
      (Date.now() - project.startedAt.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const lastReflection = project.reflections[0] ?? null;

  try {
    return {
      activeProject: project.title,
      currentPhase: project.phase as ProjectPhase,
      focusAreas: project.focusAreas.map((fa) => fa.title),
      completedSteps,
      totalSteps: allSteps.length,
      lastReflection: lastReflection
        ? { content: lastReflection.content, phase: lastReflection.phase }
        : null,
      pendingInsights: project.insights.length,
      daysActive,
    };
  } catch (error: unknown) {
    logError("PROJECT", error, { userId, action: "get_project_coach_context" });
    return null;
  }
}
