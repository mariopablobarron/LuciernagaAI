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

  const [totalCreated, totalCompleted] = await Promise.all([
    prisma.action.count({
      where: {
        createdAt: { gte: since },
        goal: {
          userId,
        },
      },
    }),
    prisma.action.count({
      where: {
        completed: true,
        createdAt: { gte: since },
        goal: {
          userId,
        },
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

  const [totalActions, totalAvoidance] = await Promise.all([
    prisma.action.count({
      where: {
        createdAt: { gte: since },
        goal: {
          userId,
        },
      },
    }),
    prisma.avoidanceEvent.count({
      where: {
        userId,
        createdAt: { gte: since },
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
