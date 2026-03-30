import { getPrismaClient } from "@/db/prisma";

/**
 * Calcula la tasa de completación de acciones en los últimos N días.
 *
 * Formula: acciones completadas / acciones creadas
 * Si no hay acciones, retorna 0.
 */
export async function getActionCompletionRate(
  userId: string,
  daysBack: number = 7
): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const byUser = userId.trim().length > 0;

  const [totalCreated, totalCompleted] = await Promise.all([
    prisma.action.count({
      where: {
        createdAt: { gte: since },
        ...(byUser ? { goal: { userId } } : {}),
      },
    }),
    prisma.action.count({
      where: {
        completed: true,
        createdAt: { gte: since },
        ...(byUser ? { goal: { userId } } : {}),
      },
    }),
  ]);

  if (totalCreated === 0) {
    return 0;
  }

  return totalCompleted / totalCreated;
}

/**
 * Calcula la tasa de evitación: eventos de avoidance / acciones creadas.
 */
export async function getAvoidanceRate(userId: string, daysBack: number = 7): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const byUser = userId.trim().length > 0;

  const [totalActions, totalAvoidance] = await Promise.all([
    prisma.action.count({
      where: {
        createdAt: { gte: since },
        ...(byUser ? { goal: { userId } } : {}),
      },
    }),
    prisma.avoidanceEvent.count({
      where: {
        createdAt: { gte: since },
        ...(byUser ? { userId } : {}),
      },
    }),
  ]);

  if (totalActions === 0) {
    return 0;
  }

  return totalAvoidance / totalActions;
}

/**
 * Calcula mensajes promedio por usuario (para contexto multi-usuario).
 */
export async function getMessagesPerUser(daysBack: number = 7): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [totalMessages, uniqueUsers] = await Promise.all([
    prisma.message.count({
      where: {
        createdAt: { gte: since },
      },
    }),
    prisma.message.findMany({
      where: {
        createdAt: { gte: since },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
  ]);

  if (uniqueUsers.length === 0) {
    return 0;
  }

  return totalMessages / uniqueUsers.length;
}

/**
 * Obtiene estadísticas agregadas de eventos en un rango de tiempo.
 */
export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  uniqueUsersWithEvents: number;
  averageEventsPerUser: number;
}

export async function getEventMetrics(daysBack: number = 7): Promise<EventMetrics> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  try {
    const totalEvents = await prisma.event.count({
      where: {
        createdAt: { gte: since },
      },
    });

    const eventsByTypeRaw = await prisma.event.groupBy({
      by: ["type"],
      where: {
        createdAt: { gte: since },
      },
      _count: true,
    });

    const eventsByType: Record<string, number> = {};
    for (const group of eventsByTypeRaw) {
      eventsByType[group.type] = group._count;
    }

    const uniqueUsersWithEvents = await prisma.event.findMany({
      where: {
        createdAt: { gte: since },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    });

    const uniqueCount = uniqueUsersWithEvents.length;
    const averageEventsPerUser = uniqueCount > 0 ? totalEvents / uniqueCount : 0;

    return {
      totalEvents,
      eventsByType,
      uniqueUsersWithEvents: uniqueCount,
      averageEventsPerUser,
    };
  } catch {
    return {
      totalEvents: 0,
      eventsByType: {},
      uniqueUsersWithEvents: 0,
      averageEventsPerUser: 0,
    };
  }
}

/**
 * Obtiene usuarios con patrón de evitación (múltiples eventos AVOIDANCE_DETECTED).
 */
export async function getUsersWithAvoidancePattern(
  minEventsThreshold: number = 3,
  daysBack: number = 7
): Promise<
  Array<{
    userId: string;
    avoidanceCount: number;
  }>
> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const avoidanceByUser = await prisma.avoidanceEvent.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: since },
    },
    _count: true,
  });

  return avoidanceByUser
    .filter((group) => group._count >= minEventsThreshold)
    .map((group) => ({
      userId: group.userId,
      avoidanceCount: group._count,
    }));
}

/**
 * Obtiene usuarios high-engagement (múltiples eventos de cualquier tipo).
 */
export async function getHighEngagementUsers(
  minEventsThreshold: number = 10,
  daysBack: number = 7
): Promise<
  Array<{
    userId: string;
    eventCount: number;
    totalMessages: number;
  }>
> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  try {
    const eventsByUser = await prisma.event.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
      },
      _count: true,
    });

    const highEngagementUsers = eventsByUser.filter((group) => group._count >= minEventsThreshold);

    if (highEngagementUsers.length === 0) {
      return [];
    }

    const userIds = highEngagementUsers.map((group) => group.userId);

    const messagesByUser = await prisma.message.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        createdAt: { gte: since },
      },
      _count: true,
    });

    const messageMap = new Map<string, number>();
    for (const group of messagesByUser) {
      if (group.userId) {
        messageMap.set(group.userId, group._count);
      }
    }

    return highEngagementUsers.map((group) => ({
      userId: group.userId,
      eventCount: group._count,
      totalMessages: messageMap.get(group.userId) ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Calcula acciones por conversación para medir intensidad de coaching.
 * Retorna: { totalSuggested, totalConversations, actionsPerConversation }
 */
export async function getActionsPerConversation(daysBack: number = 7) {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  try {
    // Contar eventos ACTION_SUGGESTED únicos
    const actionSuggested = await prisma.event.groupBy({
      by: ["userId"],
      where: {
        type: "ACTION_SUGGESTED",
        createdAt: { gte: since },
      },
      _count: true,
    });

    // Contar IDs únicos de conversación (via metadata.conversationId)
    const allActionEvents = await prisma.event.findMany({
      where: {
        type: "ACTION_SUGGESTED",
        createdAt: { gte: since },
      },
      select: {
        userId: true,
        metadata: true,
      },
    });

    const conversationMap = new Map<string, Set<string>>();
    for (const event of allActionEvents) {
      const meta = event.metadata as Record<string, unknown>;
      const conversationId = meta?.conversationId as string | undefined;

      if (event.userId && conversationId) {
        if (!conversationMap.has(event.userId)) {
          conversationMap.set(event.userId, new Set());
        }
        conversationMap.get(event.userId)?.add(conversationId);
      }
    }

    let totalSuggested = 0;
    let totalConversations = 0;

    for (const group of actionSuggested) {
      totalSuggested += group._count;
      if (group.userId) {
        totalConversations += conversationMap.get(group.userId)?.size ?? 0;
      }
    }

    return {
      totalSuggested,
      totalConversations,
      actionsPerConversation: totalConversations > 0 ? totalSuggested / totalConversations : 0,
    };
  } catch {
    return {
      totalSuggested: 0,
      totalConversations: 0,
      actionsPerConversation: 0,
    };
  }
}

/**
 * Segmenta usuarios basado en patrones de comportamiento reciente.
 * Retorna: { blockedUsers, activeUsers, avoidanceUsers, crisisUsers }
 */
export async function getUserSegments(daysBack: number = 7) {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  try {
    // Obtener todos los usuarios únicos con eventos
    const allUsers = await prisma.event.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
      },
    });

    const blockedUsers = new Set<string>();
    const activeUsers = new Set<string>();
    const avoidanceUsers = new Set<string>();
    const crisisUsers = new Set<string>();

    for (const group of allUsers) {
      if (!group.userId) continue;

      // Obtener eventos del usuario
      const userEvents = await prisma.event.findMany({
        where: {
          userId: group.userId,
          createdAt: { gte: since },
        },
        select: {
          type: true,
        },
      });

      const eventTypes = userEvents.map((e) => e.type);

      // Clasificar usuario basado en patrones de eventos
      if (eventTypes.some((t) => t === "CRISIS_DETECTED")) {
        crisisUsers.add(group.userId);
      } else if (eventTypes.filter((t) => t === "AVOIDANCE_DETECTED").length > 2) {
        avoidanceUsers.add(group.userId);
      } else if (eventTypes.includes("ACTION_COMPLETED") || eventTypes.includes("GOAL_COMPLETED")) {
        activeUsers.add(group.userId);
      } else if (eventTypes.filter((t) => t === "ACTION_SKIPPED").length > 1) {
        blockedUsers.add(group.userId);
      }
    }

    return {
      blockedUsersCount: blockedUsers.size,
      activeUsersCount: activeUsers.size,
      avoidanceUsersCount: avoidanceUsers.size,
      crisisUsersCount: crisisUsers.size,
      blockedUsers: Array.from(blockedUsers),
      activeUsers: Array.from(activeUsers),
      avoidanceUsers: Array.from(avoidanceUsers),
      crisisUsers: Array.from(crisisUsers),
    };
  } catch {
    return {
      blockedUsersCount: 0,
      activeUsersCount: 0,
      avoidanceUsersCount: 0,
      crisisUsersCount: 0,
      blockedUsers: [],
      activeUsers: [],
      avoidanceUsers: [],
      crisisUsers: [],
    };
  }
}
