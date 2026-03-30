import { getPrismaClient } from "@/db/prisma";
import type { EventType } from "@/domain/types";
import { logError, logInfo } from "@/lib/logger";

interface TrackEventParams {
  userId: string;
  type: EventType;
  metadata?: Record<string, unknown>;
}

/**
 * Metadata recomendada por tipo de evento (documentación operativa):
 * - MESSAGE_SENT: { conversationId, messageLength, intent }
 * - MESSAGE_RECEIVED: { conversationId, responseLength, fallback, streaming? }
 * - ACTION_CREATED: { actionId, actionText, goalId?, conversationId, source }
 * - ACTION_COMPLETED: { actionId, actionDescription?, goalId, goalTitle, completedCount, totalCount, conversationId }
 * - GOAL_CREATED: { goalId, goalTitle, actionCount, conversationId }
 * - AVOIDANCE_DETECTED: { actionId, reason?, conversationId }
 */

/**
 * Registra un evento en la base de datos.
 * Lanza errores si falla.
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  const prisma = getPrismaClient();

  try {
    const data: Parameters<typeof prisma.event.create>[0]["data"] = {
      userId: params.userId,
      type: params.type,
    };

    if (params.metadata !== undefined) {
      // Cast necessary for Prisma JSON type compatibility
      data.metadata = params.metadata as unknown as typeof data.metadata;
    }

    await prisma.event.create({
      data,
    });

    logInfo("TRACKING", `event_tracked: ${params.type}`, {
      userId: params.userId,
      type: params.type,
    });
  } catch (error: unknown) {
    logError("TRACKING", error, {
      userId: params.userId,
      type: params.type,
      context: "trackEvent",
    });
    throw error;
  }
}

/**
 * Registra un evento de forma segura sin romper el flujo.
 * Captura errores y los registra pero no los lanza.
 */
export async function trackSafe(params: TrackEventParams): Promise<void> {
  try {
    await trackEvent(params);
  } catch (error: unknown) {
    logError("TRACKING", error, {
      userId: params.userId,
      type: params.type,
      context: "trackSafe (non-critical)",
    });
    // No relanzar el error - es tracking no crítico
  }
}

/**
 * Detecta acciones con patrón de avoidance basado en tiempo.
 * Si una acción ha estado pendiente más de X horas sin intentos, regista AVOIDANCE_DETECTED.
 */
export async function detectAvoidanceByTimeForUser(
  userId: string,
  hoursThreshold: number = 24
): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

  try {
    // Obtener acciones pendientes del usuario
    const pendingActions = await prisma.action.findMany({
      where: {
        completed: false,
        goal: {
          userId,
        },
        createdAt: { lt: since },
      },
      select: {
        id: true,
        description: true,
        createdAt: true,
        goal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (pendingActions.length === 0) {
      return 0;
    }

    // Para cada acción antigua y sin completar, registrar AVOIDANCE_DETECTED
    let detectedCount = 0;
    for (const action of pendingActions) {
      // Verificar si ya existe evento AVOIDANCE_DETECTED reciente para esta acción
      let recentAvoidanceEvent = null;
      try {
        recentAvoidanceEvent = await prisma.event.findFirst({
          where: {
            userId,
            type: "AVOIDANCE_DETECTED",
            metadata: {
              path: ["actionId"],
              equals: action.id,
            },
            createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }, // último evento en 6h
          },
        });
      } catch {
        // Event table might not exist or have issues, continue
      }

      if (!recentAvoidanceEvent) {
        await trackSafe({
          userId,
          type: "AVOIDANCE_DETECTED",
          metadata: {
            actionId: action.id,
            actionDescription: action.description,
            pendingSinceDays: Math.round(
              (Date.now() - action.createdAt.getTime()) / (24 * 60 * 60 * 1000)
            ),
            goalId: action.goal.id,
            goalTitle: action.goal.title,
          },
        });
        detectedCount++;
      }
    }

    return detectedCount;
  } catch {
    return 0;
  }
}

/**
 * Obtiene eventos recientes de un usuario agrupados por tipo.
 */
export async function getRecentEventsByType(
  userId: string,
  hoursBack: number = 24
): Promise<Map<EventType, number>> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  try {
    const events = await prisma.event.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      select: {
        type: true,
      },
    });

    const typeCounts = new Map<EventType, number>();
    for (const event of events) {
      const type = event.type as EventType;
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }

    return typeCounts;
  } catch {
    return new Map();
  }
}

/**
 * Obtiene el último evento de un tipo específico para un usuario.
 */
export async function getLastEventOfType(
  userId: string,
  type: EventType
): Promise<{ createdAt: Date } | null> {
  const prisma = getPrismaClient();

  const event = await prisma.event.findFirst({
    where: {
      userId,
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  return event ?? null;
}

/**
 * Cuenta eventos de un tipo en un rango de tiempo.
 */
export async function countEventsByTypeInRange(
  userId: string,
  type: EventType,
  hoursBack: number
): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  return prisma.event.count({
    where: {
      userId,
      type,
      createdAt: { gte: since },
    },
  });
}

/**
 * Elimina eventos antiguos (retención de 90 días).
 * Útil para mantenimiento.
 */
export async function deleteOldEvents(daysBack: number = 90): Promise<number> {
  const prisma = getPrismaClient();
  const before = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.event.deleteMany({
      where: {
        createdAt: { lt: before },
      },
    });

    logInfo("TRACKING", "old_events_deleted", {
      count: result.count,
      before: before.toISOString(),
    });

    return result.count;
  } catch (error: unknown) {
    logError("TRACKING", error, {
      context: "deleteOldEvents",
      daysBack,
    });
    throw error;
  }
}
