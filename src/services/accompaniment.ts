import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export type PriorityLevel = "high" | "medium" | "low";
export type TrendDirection = "improving" | "stable" | "worsening";

export type UserPriority = {
  priority: PriorityLevel;
  reason: string;
  trend: TrendDirection;
};

export type UserSummary = {
  lastMessages: Array<{ role: string; content: string; createdAt: string }>;
  dominantEmotion: string | null;
  pendingActions: Array<{ id: string; description: string; goalTitle: string }>;
  lastCrisisEvent: { level: string; createdAt: string } | null;
};

export type InterventionRecommendation = {
  type: "immediate" | "direct_question" | "reminder" | "positive_reinforcement" | "none";
  text: string;
};

function resolveTrend(progressTrend: string | undefined): TrendDirection {
  if (progressTrend === "mejor" || progressTrend === "mejorando") return "improving";
  if (progressTrend === "peor" || progressTrend === "empeorando") return "worsening";
  return "stable";
}

export async function getUserPriority(userId: string): Promise<UserPriority> {
  const prisma = getPrismaClient();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [user, userState, pendingGoals, recentCrisis] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeen: true },
    }),
    prisma.userState.findUnique({
      where: { userId },
      select: { state: true, progressTrend: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      select: {
        actions: {
          where: { completed: false },
          select: { id: true },
        },
      },
    }),
    prisma.crisisEvent.findFirst({
      where: { userId, createdAt: { gte: fortyEightHoursAgo } },
      orderBy: { createdAt: "desc" },
      select: { level: true },
    }),
  ]);

  const pendingCount = pendingGoals.reduce((sum, g) => sum + g.actions.length, 0);
  const inactiveMs = user ? Date.now() - user.lastSeen.getTime() : Infinity;
  const inactiveHours = inactiveMs / (60 * 60 * 1000);
  const emotionalState = userState?.state ?? "neutral";
  const trend = resolveTrend(userState?.progressTrend);

  if (recentCrisis) {
    return {
      priority: "high",
      reason: `Crisis ${recentCrisis.level} detectada en las últimas 48h`,
      trend,
    };
  }

  if (pendingCount > 0 && inactiveHours >= 48) {
    return {
      priority: "high",
      reason: `Inactivo ${Math.floor(inactiveHours)}h con ${pendingCount} acción(es) pendiente(s)`,
      trend,
    };
  }

  if (emotionalState === "bloqueo" || emotionalState === "ansiedad") {
    return {
      priority: "medium",
      reason: `Estado emocional: ${emotionalState}`,
      trend,
    };
  }

  return {
    priority: "low",
    reason: "Sin señales de riesgo activas",
    trend,
  };
}

export async function getUserSummary(userId: string): Promise<UserSummary> {
  const prisma = getPrismaClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [lastMessages, dailyLogs, goals, lastCrisis] = await Promise.all([
    prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { role: true, content: true, createdAt: true },
    }),
    prisma.dailyLog.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { emotionalState: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      select: {
        title: true,
        actions: {
          where: { completed: false },
          select: { id: true, description: true },
        },
      },
    }),
    prisma.crisisEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { level: true, createdAt: true },
    }),
  ]);

  const emotionCounts: Record<string, number> = {};
  for (const log of dailyLogs) {
    if (log.emotionalState) {
      emotionCounts[log.emotionalState] = (emotionCounts[log.emotionalState] ?? 0) + 1;
    }
  }
  const dominantEmotion =
    Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const pendingActions = goals.flatMap((g) =>
    g.actions.map((a) => ({ id: a.id, description: a.description, goalTitle: g.title }))
  );

  return {
    lastMessages: lastMessages.reverse().map((m) => ({
      role: m.role,
      content: m.content.slice(0, 300),
      createdAt: m.createdAt.toISOString(),
    })),
    dominantEmotion,
    pendingActions,
    lastCrisisEvent: lastCrisis
      ? { level: lastCrisis.level, createdAt: lastCrisis.createdAt.toISOString() }
      : null,
  };
}

type UserForRecommendation = {
  priority: PriorityLevel;
  emotionalState: string;
  inactiveHours: number;
  hasCrisis: boolean;
  pendingActions: number;
};

export function getInterventionRecommendation(
  user: UserForRecommendation
): InterventionRecommendation {
  if (user.hasCrisis || (user.priority === "high" && user.emotionalState === "ansiedad")) {
    return {
      type: "immediate",
      text: "Intervención inmediata — verificar estado del usuario",
    };
  }

  if (user.emotionalState === "bloqueo") {
    return {
      type: "direct_question",
      text: 'Pregunta directa + concreción — "¿Qué es lo único que puedes hacer hoy?"',
    };
  }

  if (user.inactiveHours >= 48 && user.pendingActions > 0) {
    return {
      type: "reminder",
      text: "Recordatorio + presión suave — mencionar acción pendiente específica",
    };
  }

  if (user.emotionalState === "claridad") {
    return {
      type: "positive_reinforcement",
      text: "Refuerzo positivo — reconocer progreso y mantener impulso",
    };
  }

  return {
    type: "none",
    text: "Sin intervención recomendada en este momento",
  };
}

export async function sendInterventionMessage(userId: string, text: string): Promise<void> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { source: true, telegramId: true },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  if (user.source === "telegram" && user.telegramId) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: parseInt(user.telegramId, 10), text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Telegram sendMessage failed: ${res.status} ${body.slice(0, 200)}`);
    }
    return;
  }

  // Web user — store as assistant message in their most recent conversation
  const conversation = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const conversationId = conversation
    ? conversation.id
    : (
        await prisma.conversation.create({
          data: { userId, title: "Mensaje del equipo" },
          select: { id: true },
        })
      ).id;

  await prisma.message.create({
    data: { conversationId, userId, role: "assistant", content: text },
  });
}

export async function buildAccompanimentList(): Promise<
  Array<{
    userId: string;
    email: string;
    name: string | null;
    source: string;
    telegramId: string | null;
    lastSeen: string;
    messageCount: number;
    emotionalState: string;
    pendingActions: number;
    priority: PriorityLevel;
    reason: string;
    trend: TrendDirection;
    crisisActive: boolean;
    safetyFlag: boolean;
    recommendation: string;
    recommendationType: string;
  }>
> {
  const prisma = getPrismaClient();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { lastSeen: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      source: true,
      telegramId: true,
      lastSeen: true,
      messageCount: true,
    },
  });

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  const [states, pendingGoals, recentCrisis] = await Promise.all([
    prisma.userState.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, state: true, progressTrend: true, crisisActive: true },
    }),
    prisma.goal.findMany({
      where: { userId: { in: userIds }, status: "active" },
      select: {
        userId: true,
        actions: {
          where: { completed: false },
          select: { id: true },
        },
      },
    }),
    prisma.crisisEvent.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: fortyEightHoursAgo } },
      select: { userId: true, level: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stateByUser = new Map(states.map((s) => [s.userId, s]));

  const pendingCountByUser = new Map<string, number>();
  for (const goal of pendingGoals) {
    pendingCountByUser.set(goal.userId, (pendingCountByUser.get(goal.userId) ?? 0) + goal.actions.length);
  }

  const crisisByUser = new Map<string, string>();
  for (const c of recentCrisis) {
    if (!crisisByUser.has(c.userId)) crisisByUser.set(c.userId, c.level);
  }

  const now = Date.now();

  const items = users.map((user) => {
    const state = stateByUser.get(user.id);
    const emotionalState = state?.state ?? "neutral";
    const pendingActions = pendingCountByUser.get(user.id) ?? 0;
    const hasCrisis = crisisByUser.has(user.id);
    const crisisLevel = crisisByUser.get(user.id);
    const inactiveHours = (now - user.lastSeen.getTime()) / (60 * 60 * 1000);
    const trend = resolveTrend(state?.progressTrend);

    let priority: PriorityLevel;
    let reason: string;

    if (hasCrisis) {
      priority = "high";
      reason = `Crisis detectada en las últimas 48h (${crisisLevel})`;
    } else if (pendingActions > 0 && inactiveHours >= 48) {
      priority = "high";
      reason = `Inactivo ${Math.floor(inactiveHours)}h con ${pendingActions} acción(es) pendiente(s)`;
    } else if (emotionalState === "bloqueo" || emotionalState === "ansiedad") {
      priority = "medium";
      reason = `Estado emocional: ${emotionalState}`;
    } else {
      priority = "low";
      reason = "Sin señales de riesgo activas";
    }

    const safetyFlag = hasCrisis && crisisLevel === "critical";

    const recommendation = getInterventionRecommendation({
      priority,
      emotionalState,
      inactiveHours,
      hasCrisis,
      pendingActions,
    });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      source: user.source ?? "web",
      telegramId: user.telegramId,
      lastSeen: user.lastSeen.toISOString(),
      messageCount: user.messageCount,
      emotionalState,
      pendingActions,
      priority,
      reason,
      trend,
      crisisActive: state?.crisisActive ?? false,
      safetyFlag,
      recommendation: recommendation.text,
      recommendationType: recommendation.type,
    };
  });

  const priorityOrder: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return items;
}

export async function trackUserMessage(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date(), messageCount: { increment: 1 } },
    });
  } catch (error: unknown) {
    logError("ACCOMPANIMENT", error, { area: "trackUserMessage", userId });
  }
}
