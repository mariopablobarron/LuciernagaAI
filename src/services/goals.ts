import { getPrismaClient } from "@/db/prisma";
import { dispatchN8nEvent } from "@/lib/n8n";
import { awardLatidos } from "@/services/latidos";
import { ensureUserSession } from "@/services/conversation";
import { GoalStatus } from "@prisma/client";

export type GoalActionItem = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
};

export type AvoidanceType = "postpone" | "refuse" | "avoidance";

export type GoalWithProgress = {
  id: string;
  title: string;
  status: GoalStatus;
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

const GOAL_INFERENCE_PATTERNS: Array<{
  pattern: RegExp;
  buildTitle: (focus: string) => string;
}> = [
  {
    pattern: /\bno s[eé] si\s+(.+)/i,
    buildTitle: (focus) => `Decidir si ${focus}`,
  },
  {
    pattern: /\b(tengo un problema con|problema con)\s+(.+)/i,
    buildTitle: (focus) => `Resolver ${focus}`,
  },
  {
    pattern: /\b(me cuesta|me est[aá] costando)\s+(.+)/i,
    buildTitle: (focus) => `Desbloquear ${focus}`,
  },
  {
    pattern: /\b(estoy bloquead[oa] con|bloquead[oa] con)\s+(.+)/i,
    buildTitle: (focus) => `Desbloquear ${focus}`,
  },
  {
    pattern: /\b(quiero claridad sobre|necesito claridad sobre)\s+(.+)/i,
    buildTitle: (focus) => `Ganar claridad sobre ${focus}`,
  },
  {
    pattern: /\b(me preocupa)\s+(.+)/i,
    buildTitle: (focus) => `Resolver ${focus}`,
  },
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

const SIDESTEP_PATTERNS = [
  "otra cosa",
  "otro tema",
  "cambiemos de tema",
  "prefiero no pensar en eso",
  "prefiero no hablar de eso",
  "dejemos eso",
  "ya veremos",
  "da igual",
  "no quiero entrar ahi",
  "no quiero entrar ahí",
];

const RELEVANT_CONVERSATION_PATTERNS = [
  /\b(no s[eé]|duda|dudas|bloque|ansiedad|problema|me cuesta|no puedo|quiero|necesito|tengo que|debo|decidir|me preocupa)\b/i,
];

const IRRELEVANT_SHORT_PATTERNS = [/^(hola|buenas|gracias|ok|vale|perfecto|entiendo)$/i];

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
  activeAction: string | null;
  avoidanceDetected: boolean;
  avoidanceCount: number;
  unfinishedActionsCount: number;
  confrontationMode: boolean;
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

function cleanGoalFocus(value: string): string {
  return normalizeGoalTitle(
    value
      .replace(/^(que|qué)\s+/i, "")
      .replace(/^(hacer|resolver|decidir)\s+/i, "")
      .trim()
  );
}

function fallbackGoalTitleFromMessage(message: string): string | null {
  const cleaned = normalizeGoalTitle(
    message
      .replace(/[¿?¡!]/g, "")
      .replace(
        /\b(hola|buenas|gracias|por favor|me siento|estoy|ahora mismo|en este momento)\b/gi,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
  );

  if (cleaned.length < 18) {
    return null;
  }

  return normalizeGoalTitle(`Aclarar y avanzar con ${cleaned}`);
}

export function isRelevantConversation(message: string): boolean {
  const normalized = normalizeText(message);
  if (normalized.length < 12) {
    return false;
  }

  if (IRRELEVANT_SHORT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return RELEVANT_CONVERSATION_PATTERNS.some((pattern) => pattern.test(normalized));
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

  for (const rule of GOAL_INFERENCE_PATTERNS) {
    const match = message.match(rule.pattern);
    const rawFocus = match?.[2] ?? match?.[1];
    if (!rawFocus) {
      continue;
    }

    const focus = cleanGoalFocus(rawFocus);
    if (!focus) {
      continue;
    }

    const title = normalizeGoalTitle(rule.buildTitle(focus));
    if (title) {
      return title;
    }
  }

  if (!isRelevantConversation(message)) {
    return null;
  }

  return fallbackGoalTitleFromMessage(message);
}

export function detectAvoidance(message: string): boolean {
  const normalized = normalizeText(message);
  return (
    AVOIDANCE_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    SIDESTEP_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    POSTPONE_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    REFUSAL_PATTERNS.some((pattern) => normalized.includes(pattern))
  );
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
  status: GoalStatus;
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

function getGoalStatusFromActions(actions: GoalActionItem[]): GoalStatus {
  return actions.length > 0 && actions.every((action) => action.completed) ? "completed" : "active";
}

type GoalRecord = {
  id: string;
  title: string;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
  actions: GoalActionItem[];
};

function prioritizeGoalRecords(goals: GoalRecord[]): GoalRecord | undefined {
  if (goals.length === 0) return undefined;
  return [...goals].sort((left, right) => {
    const leftHasPending = left.actions.some((action) => !action.completed) ? 1 : 0;
    const rightHasPending = right.actions.some((action) => !action.completed) ? 1 : 0;

    if (rightHasPending !== leftHasPending) {
      return rightHasPending - leftHasPending;
    }

    if (right.updatedAt.getTime() !== left.updatedAt.getTime()) {
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
}

export function detectGoalAvoidance(message: string): boolean {
  return detectAvoidance(message);
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

export function countPendingActions(goal: GoalWithProgress | null): number {
  if (!goal) {
    return 0;
  }

  return goal.actions.filter((action) => !action.completed).length;
}

export function buildGoalCoachContext(
  goal: GoalWithProgress | null,
  latestMessage: string,
  options: number | { avoidanceCount?: number; avoidanceDetected?: boolean } = 0
): GoalCoachContext | null {
  if (!goal) {
    return null;
  }

  const pendingActions = goal.actions.filter((action) => !action.completed);
  const avoidanceCount = typeof options === "number" ? options : (options.avoidanceCount ?? 0);
  const avoidanceDetected =
    typeof options === "number"
      ? detectAvoidance(latestMessage)
      : (options.avoidanceDetected ?? detectAvoidance(latestMessage));
  const unfinishedActionsCount = pendingActions.length;

  return {
    title: goal.title,
    progress: goal.progress,
    pendingActions: pendingActions.map((action) => action.description).slice(0, 3),
    activeAction: pendingActions[0]?.description ?? null,
    avoidanceDetected: pendingActions.length > 0 && avoidanceDetected,
    avoidanceCount,
    unfinishedActionsCount,
    confrontationMode:
      (pendingActions.length > 0 && avoidanceDetected) ||
      avoidanceCount >= 2 ||
      unfinishedActionsCount > 2,
  };
}

export async function getActiveGoalForUser(userId: string): Promise<GoalWithProgress | null> {
  const prisma = getPrismaClient();
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: "active",
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (goals.length === 0) {
    return null;
  }

  const prioritizedGoal = prioritizeGoalRecords(goals);
  if (!prioritizedGoal) return null;
  const staleGoalIds = goals
    .filter((goal) => goal.id !== prioritizedGoal.id)
    .map((goal) => goal.id);

  if (staleGoalIds.length > 0) {
    await prisma.goal.updateMany({
      where: {
        id: { in: staleGoalIds },
      },
      data: {
        status: "paused",
      },
    });
  }

  return mapGoalWithProgress(prioritizedGoal);
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
  await prisma.goal.updateMany({
    where: {
      userId: params.userId,
      status: "active",
    },
    data: {
      status: "paused",
    },
  });

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

async function activateGoalForUser(
  userId: string,
  goalId: string
): Promise<GoalWithProgress | null> {
  const prisma = getPrismaClient();

  await prisma.goal.updateMany({
    where: {
      userId,
      status: "active",
      NOT: { id: goalId },
    },
    data: {
      status: "paused",
    },
  });

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: { status: "active" },
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (goal.userId !== userId) {
    return null;
  }

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
      status: {
        in: ["active", "paused"],
      },
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
    if (existing.status !== "active") {
      const reactivatedGoal = await activateGoalForUser(params.userId, existing.id);
      if (reactivatedGoal) {
        return {
          goal: reactivatedGoal,
          created: false,
        };
      }
    }

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

  // Award latidos when completing (not uncompleting) an action
  if (params.completed) {
    void awardLatidos(params.userId, "action_complete").catch(() => {});
  }

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

    if (nextStatus === "completed") {
      dispatchN8nEvent("goal.completed", { goalId: goal.id, goalTitle: goal.title }, params.userId);
      void awardLatidos(params.userId, "goal_complete").catch(() => {});
    }
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

  const [result] = await Promise.all([
    updateGoalAction({ userId, actionId: firstPending.id, completed: true }),
    resetAvoidanceForAction(firstPending.id),
  ]);

  return result;
}

export async function getAvoidanceCountForAction(
  userId: string,
  actionId: string
): Promise<number> {
  const prisma = getPrismaClient();
  return prisma.avoidanceEvent.count({ where: { userId, actionId } });
}

/**
 * Calcula cuántos "turnos consecutivos" de evasión ha tenido el usuario
 * dentro de la ventana de tiempo indicada (por defecto, últimas 24 h).
 * Dos eventos con menos de 3 minutos de diferencia se consideran el mismo turno.
 */
export async function getAvoidanceStreakForUser(userId: string, windowHours = 24): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const events = await prisma.avoidanceEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (events.length === 0) return 0;

  // Agrupa eventos en "turnos" si están a menos de 3 min entre sí.
  const TURN_GAP_MS = 3 * 60 * 1000;
  let turns = 1;
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].createdAt.getTime() - events[i - 1].createdAt.getTime();
    if (gap > TURN_GAP_MS) {
      turns++;
    }
  }

  return turns;
}

export async function resetAvoidanceForAction(actionId: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.avoidanceEvent.deleteMany({ where: { actionId } });
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
