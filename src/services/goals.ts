import { getPrismaClient } from "@/db/prisma";
import { ensureUserSession } from "@/services/conversation";

export type GoalActionItem = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
};

export type AvoidanceType = "postpone" | "refuse";

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
  /\bnecesito\s+(.+)/i,
  /\btengo que\s+(.+)/i,
  /\bdebo\s+(.+)/i,
  /\bme gustar(?:i|í)a\s+(.+)/i,
  /\bmi objetivo es\s+(.+)/i,
];

const AVOIDANCE_PATTERNS = [
  "mañana",
  "manana",
  "luego",
  "despues",
  "después",
  "todavia no",
  "todavía no",
  "no hice",
  "no lo hice",
  "no avance",
  "no avancé",
  "evite",
  "evité",
  "lo pospuse",
  "mas tarde",
  "más tarde",
];

const COMPLETION_PATTERNS = [
  "ya lo hice",
  "ya hice",
  "hecho",
  "listo",
  "terminado",
  "termine",
  "terminé",
  "acabado",
  "completado",
  "ya avance",
  "ya avancé",
];

const POSTPONE_PATTERNS = [
  "lo hago luego",
  "lo hare luego",
  "lo haré luego",
  "mañana",
  "manana",
  "no ahora",
  "mas tarde",
  "más tarde",
  "ahora no",
  "despues",
  "después",
];

const REFUSAL_PATTERNS = [
  "no quiero",
  "no lo voy a hacer",
  "no voy a hacerlo",
  "no lo hare",
  "no lo haré",
  "paso",
  "no pienso hacerlo",
];

export type GoalCoachContext = {
  title: string;
  progress: number;
  pendingActions: string[];
  avoidanceDetected: boolean;
  avoidanceCount: number;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

  const normalized = normalizeText(goalTitle);
  if (/(estudio|examen|universidad|tesis|curso|clase)/.test(normalized)) {
    return [
      `Definir el tema o bloque exacto que vas a estudiar para: ${focus}`,
      "Bloquear 25 minutos hoy sin distracciones para estudiarlo",
      "Cerrar el bloque con una evidencia: resumen, ejercicio o repaso hecho",
    ];
  }

  if (/(trabajo|cliente|proyecto|jefe|empleo|negocio)/.test(normalized)) {
    return [
      `Definir el entregable concreto de: ${focus}`,
      "Reservar un bloque de trabajo hoy para el primer avance visible",
      "Enviar o dejar listo un avance comprobable antes de terminar el día",
    ];
  }

  if (/(pareja|familia|relacion|relación|amigo|amiga)/.test(normalized)) {
    return [
      `Definir la conversación o gesto concreto que necesitas hacer sobre: ${focus}`,
      "Preparar el mensaje o idea principal en una nota breve",
      "Dar el primer paso real hoy: escribir, llamar o proponer conversación",
    ];
  }

  return [
    `Definir el primer paso concreto para: ${focus}`,
    "Bloquear tiempo hoy para ejecutar ese primer paso",
    "Cerrar el día con una evidencia visible de avance",
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

function getGoalStatusFromActions(actions: GoalActionItem[]): string {
  return actions.length > 0 && actions.every((action) => action.completed) ? "completed" : "active";
}

export function detectGoalAvoidance(message: string): boolean {
  const normalized = normalizeText(message);
  return AVOIDANCE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function detectActionCompletionIntent(message: string): boolean {
  const normalized = normalizeText(message);
  return COMPLETION_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function detectActionPostponeIntent(message: string): boolean {
  const normalized = normalizeText(message);
  return POSTPONE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function detectActionRefusalIntent(message: string): boolean {
  const normalized = normalizeText(message);
  return REFUSAL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function getFirstPendingAction(goal: GoalWithProgress | null): GoalActionItem | null {
  if (!goal) {
    return null;
  }

  return goal.actions.find((action) => !action.completed) ?? null;
}

export function buildGoalCoachContext(
  goal: GoalWithProgress | null,
  latestMessage: string,
  avoidanceCount = 0
): GoalCoachContext | null {
  if (!goal) {
    return null;
  }

  const pendingActions = goal.actions.filter((action) => !action.completed);

  return {
    title: goal.title,
    progress: goal.progress,
    pendingActions: pendingActions.map((action) => action.description).slice(0, 3),
    avoidanceDetected: pendingActions.length > 0 && detectGoalAvoidance(latestMessage),
    avoidanceCount,
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

  let goal = await prisma.goal.findUnique({
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

  const nextStatus = getGoalStatusFromActions(goal.actions);
  if (goal.status !== nextStatus) {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { status: nextStatus },
    });
    goal = {
      ...goal,
      status: nextStatus,
    };
  }

  return mapGoalWithProgress(goal);
}

export async function completeFirstPendingActionForUser(
  userId: string
): Promise<GoalWithProgress | null> {
  const activeGoal = await getActiveGoalForUser(userId);
  if (!activeGoal) {
    return null;
  }

  const firstPending = activeGoal.actions.find((action) => !action.completed);
  if (!firstPending) {
    return activeGoal;
  }

  return updateGoalAction({
    userId,
    actionId: firstPending.id,
    completed: true,
  });
}

export async function registerAvoidanceEvent(params: {
  userId: string;
  actionId: string;
  type: AvoidanceType;
}): Promise<number> {
  const prisma = getPrismaClient();

  await prisma.avoidanceEvent.create({
    data: {
      userId: params.userId,
      actionId: params.actionId,
      type: params.type,
    },
  });

  return prisma.avoidanceEvent.count({
    where: {
      userId: params.userId,
      actionId: params.actionId,
    },
  });
}
