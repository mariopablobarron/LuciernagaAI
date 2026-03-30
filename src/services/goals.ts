import { getPrismaClient } from "@/db/prisma";
import { ensureUserSession } from "@/services/conversation";

export type GoalActionItem = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
};

export type GoalWithProgress = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  actions: GoalActionItem[];
  completedCount: number;
  totalCount: number;
  progress: number;
};

const GOAL_INTENT_PATTERNS: RegExp[] = [
  /\bquiero\s+(.+)/i,
  /\bme gustar(?:i|í)a\s+(.+)/i,
  /\bmi objetivo es\s+(.+)/i,
];

function normalizeGoalTitle(value: string): string {
  const trimmed = value.trim().replace(/[.!?]+$/g, "");
  const compact = trimmed.replace(/\s+/g, " ");
  if (compact.length <= 2) {
    return "";
  }
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

export function detectGoalIntent(message: string): string | null {
  for (const pattern of GOAL_INTENT_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const title = normalizeGoalTitle(match[1]);
      if (title) {
        return title;
      }
    }
  }
  return null;
}

function defaultActionsForGoal(goalTitle: string): string[] {
  const focus = goalTitle.length > 64 ? `${goalTitle.slice(0, 64)}...` : goalTitle;
  return [
    `Definir el primer paso concreto para: ${focus}`,
    "Ejecutar ese primer paso hoy",
  ];
}

function computeProgress(actions: GoalActionItem[]): {
  completedCount: number;
  totalCount: number;
  progress: number;
} {
  const totalCount = actions.length;
  const completedCount = actions.filter((action) => action.completed).length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, progress };
}

function mapGoalWithProgress(goal: {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  actions: GoalActionItem[];
}): GoalWithProgress {
  const metrics = computeProgress(goal.actions);
  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    actions: goal.actions,
    completedCount: metrics.completedCount,
    totalCount: metrics.totalCount,
    progress: metrics.progress,
  };
}

export async function getActiveGoalForUser(userId: string): Promise<GoalWithProgress | null> {
  const prisma = getPrismaClient();
  const goal = await prisma.goal.findFirst({
    where: {
      userId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!goal) {
    return null;
  }

  return mapGoalWithProgress(goal);
}

export async function createGoalForUser(params: {
  userId: string;
  title: string;
  actions?: string[];
}): Promise<GoalWithProgress> {
  const prisma = getPrismaClient();
  const title = normalizeGoalTitle(params.title);
  if (!title) {
    throw new Error("GOAL_TITLE_REQUIRED");
  }

  await ensureUserSession(params.userId);

  const actionDescriptions = (params.actions || [])
    .map((action) => action.trim())
    .filter((action) => action.length > 0);

  const goal = await prisma.goal.create({
    data: {
      userId: params.userId,
      title,
      status: "active",
      actions: {
        create: (actionDescriptions.length > 0
          ? actionDescriptions
          : defaultActionsForGoal(title)
        ).map((description) => ({ description })),
      },
    },
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return mapGoalWithProgress(goal);
}

export async function createGoalFromIntentMessage(params: {
  userId: string;
  message: string;
}): Promise<{ goal: GoalWithProgress; created: boolean } | null> {
  const detectedTitle = detectGoalIntent(params.message);
  if (!detectedTitle) {
    return null;
  }

  const prisma = getPrismaClient();
  await ensureUserSession(params.userId);

  const existing = await prisma.goal.findFirst({
    where: {
      userId: params.userId,
      status: "active",
      title: {
        equals: detectedTitle,
        mode: "insensitive",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (existing) {
    return {
      goal: mapGoalWithProgress(existing),
      created: false,
    };
  }

  const createdGoal = await createGoalForUser({
    userId: params.userId,
    title: detectedTitle,
  });

  return {
    goal: createdGoal,
    created: true,
  };
}

export async function updateGoalAction(params: {
  userId: string;
  actionId: string;
  completed: boolean;
}): Promise<GoalWithProgress | null> {
  const prisma = getPrismaClient();

  const action = await prisma.action.findUnique({
    where: { id: params.actionId },
    include: {
      goal: true,
    },
  });

  if (!action || action.goal.userId !== params.userId) {
    return null;
  }

  await prisma.action.update({
    where: { id: params.actionId },
    data: { completed: params.completed },
  });

  const goal = await prisma.goal.findUnique({
    where: { id: action.goalId },
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!goal || goal.userId !== params.userId) {
    return null;
  }

  return mapGoalWithProgress(goal);
}
