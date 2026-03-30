import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { dispatchAutomatedAlerts } from "@/lib/alerts";
import { logError, logInfo } from "@/lib/logger";
import { generateDecision, type DecisionMetrics } from "@/services/decision";
import { generateInsights, getInsightConfidence } from "@/services/insights";
import { getRecentCrisisStats, listRecentCrisisEvents } from "@/services/risk";
import { getDominantState } from "@/services/state";

export const dynamic = "force-dynamic";

type AlertItem = {
  type: "critical" | "warning";
  title: string;
  message: string;
};

function buildAlerts(
  metrics: DecisionMetrics,
  crisisStats: { total: number; high: number; critical: number },
  avoidanceStats: { total: number; postpone: number; refuse: number }
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (metrics.retentionDay3 < 0.4) {
    alerts.push({
      type: "critical",
      title: "Retención D3 en riesgo",
      message: `Retention D3 cayó a ${(metrics.retentionDay3 * 100).toFixed(1)}%.`,
    });
  }

  if (metrics.checkinDrop > 0.6) {
    alerts.push({
      type: "critical",
      title: "Abandono alto en check-ins",
      message: `Checkin drop en ${(metrics.checkinDrop * 100).toFixed(1)}%.`,
    });
  }

  if (metrics.dominantState === "bloqueo") {
    alerts.push({
      type: "warning",
      title: "Bloqueo dominante",
      message: "El estado emocional dominante es bloqueo.",
    });
  }

  if (crisisStats.total > 0) {
    alerts.push({
      type: "critical",
      title: "Eventos de crisis detectados",
      message: `Se registraron ${crisisStats.total} evento(s) de riesgo alto/crítico en los últimos 7 días (${crisisStats.critical} críticos).`,
    });
  }

  if (avoidanceStats.refuse >= 3) {
    alerts.push({
      type: "warning",
      title: "Resistencia explícita a acciones",
      message: `Se detectaron ${avoidanceStats.refuse} rechazos explícitos de acciones en 7 días.`,
    });
  } else if (avoidanceStats.total >= 6) {
    alerts.push({
      type: "warning",
      title: "Evitación recurrente",
      message: `Se registraron ${avoidanceStats.total} eventos de evitación en 7 días.`,
    });
  }

  return alerts;
}

function getDecisionMetricForLog(metrics: DecisionMetrics): { metric: string; value: number } {
  if (metrics.retentionDay3 < 0.4) {
    return { metric: "retentionDay3", value: metrics.retentionDay3 };
  }

  if (metrics.checkinDrop > 0.6) {
    return { metric: "checkinDrop", value: metrics.checkinDrop };
  }

  if (metrics.dominantState === "bloqueo") {
    return { metric: "dominantState", value: 1 };
  }

  return { metric: "overall", value: metrics.retentionDay7 };
}

function smoothRate(numerator: number, denominator: number, prior = 0.5, strength = 4): number {
  if (denominator <= 0) {
    return prior;
  }

  const value = (numerator + prior * strength) / (denominator + strength);
  return Math.min(1, Math.max(0, value));
}

function truncateMessage(message: string, maxLength = 140): string {
  const normalized = message.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

export async function GET(req: NextRequest) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        {
          error: "UNAUTHORIZED_ADMIN",
          message: "Admin authentication required.",
        },
        { status: 401 }
      );

      if (adminAuth.source === "invalid") {
        clearAdminSessionCookie(unauthorized);
      }

      return unauthorized;
    }

    const prisma = getPrismaClient();

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const usersCreatedLast7d = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const totalUsers = await prisma.user.count();
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: threeDaysAgo } },
    });

    const usersWithCheckinDay3: Array<{ userId: string }> = await prisma.dailyCheckin.findMany({
      where: { createdAt: { gte: threeDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const usersActiveLast7d: Array<{ userId: string }> = await prisma.dailyCheckin.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const activeUserIds = usersActiveLast7d.map((item) => item.userId);
    const activeUsers =
      activeUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: activeUserIds } },
            select: { id: true, createdAt: true },
          })
        : [];

    const activeNewUsers = activeUsers.filter((user) => user.createdAt >= threeDaysAgo).length;
    const activeReturningUsers = Math.max(activeUsers.length - activeNewUsers, 0);
    const returningUsers = Math.max(totalUsers - newUsers, 0);
    const inactiveUsers = Math.max(totalUsers - activeUsers.length, 0);

    const totalCheckinsLast7d = await prisma.dailyCheckin.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const recentMessages = await prisma.message.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { content: true },
      take: 300,
      orderBy: { createdAt: "desc" },
    });

    const statesFromMessages = recentMessages.map((m: { content: string }) => m.content);
    const dominantState = getDominantState(statesFromMessages);

    const retentionDay3 = smoothRate(usersWithCheckinDay3.length, usersCreatedLast7d, 0.45, 4);
    const retentionDay7 = smoothRate(usersActiveLast7d.length, usersCreatedLast7d, 0.4, 4);

    const expectedCheckins = Math.max(usersActiveLast7d.length * 7, 1);
    const checkinCompletion = smoothRate(totalCheckinsLast7d, expectedCheckins, 0.35, 6);
    const checkinDrop = Math.max(0, 1 - checkinCompletion);
    const crisisStats = await getRecentCrisisStats(sevenDaysAgo);
    const recentCrisisEvents24h = await listRecentCrisisEvents(oneDayAgo, 25);
    const recentAvoidanceEvents = await prisma.avoidanceEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: {
        action: {
          select: {
            id: true,
            description: true,
            goal: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    const crisis24h = {
      total: recentCrisisEvents24h.length,
      high: recentCrisisEvents24h.filter((event) => event.level === "high").length,
      critical: recentCrisisEvents24h.filter((event) => event.level === "critical").length,
    };
    const avoidanceByAction = new Map<
      string,
      {
        actionId: string;
        description: string;
        goalTitle: string | null;
        total: number;
        postpone: number;
        refuse: number;
      }
    >();

    for (const event of recentAvoidanceEvents) {
      const current = avoidanceByAction.get(event.actionId) ?? {
        actionId: event.actionId,
        description: event.action.description,
        goalTitle: event.action.goal?.title ?? null,
        total: 0,
        postpone: 0,
        refuse: 0,
      };

      current.total += 1;
      if (event.type === "refuse") {
        current.refuse += 1;
      } else {
        current.postpone += 1;
      }

      avoidanceByAction.set(event.actionId, current);
    }

    const topAvoidedActions = Array.from(avoidanceByAction.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
    const avoidanceStats = {
      total: recentAvoidanceEvents.length,
      postpone: recentAvoidanceEvents.filter((event) => event.type === "postpone").length,
      refuse: recentAvoidanceEvents.filter((event) => event.type === "refuse").length,
      uniqueUsers: new Set(recentAvoidanceEvents.map((event) => event.userId)).size,
    };

    const confidence = getInsightConfidence({
      totalUsers,
      totalMessages: recentMessages.length,
      totalCheckinsLast7d,
    });

    const dropOffPoint = retentionDay3 < 0.25 ? "day_1" : retentionDay3 < 0.4 ? "day_3" : "day_7";

    const metrics: DecisionMetrics = {
      retentionDay3,
      retentionDay7,
      dropOffPoint,
      checkinDrop,
      dominantState,
      avoidanceTotalLast7d: avoidanceStats.total,
      repeatPatternUsers: avoidanceStats.uniqueUsers,
      confidence,
    };

    const decision = generateDecision(metrics, dominantState);
    const insights = generateInsights({
      messages: statesFromMessages,
      retentionDay3,
      retentionDay7,
      checkinDrop,
      dropOffPoint,
      dominantState,
      totalUsers,
      totalMessages: recentMessages.length,
      totalCheckinsLast7d,
      expectedCheckinsLast7d: expectedCheckins,
      segments: {
        newUsers,
        returningUsers,
        inactiveUsers,
        activeNewUsers,
        activeReturningUsers,
      },
      avoidance: {
        totalLast7d: avoidanceStats.total,
        postponeLast7d: avoidanceStats.postpone,
        refuseLast7d: avoidanceStats.refuse,
        uniqueUsers: avoidanceStats.uniqueUsers,
        topActionTitle: topAvoidedActions[0]?.description ?? null,
      },
    });
    const alerts = buildAlerts(metrics, crisisStats, avoidanceStats);
    const recentDecisionLog = await prisma.decisionLog.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const latestInsightSnapshots = await prisma.insight.findMany({
      where: {
        createdAt: { gte: sixHoursAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const logMetric = getDecisionMetricForLog(metrics);
    const shouldPersistDecision =
      !recentDecisionLog ||
      recentDecisionLog.metric !== logMetric.metric ||
      recentDecisionLog.decision !== decision.decision ||
      Math.abs(now.getTime() - recentDecisionLog.createdAt.getTime()) > 30 * 60 * 1000;

    if (shouldPersistDecision) {
      await prisma.decisionLog.create({
        data: {
          metric: logMetric.metric,
          value: logMetric.value,
          decision: decision.decision,
        },
      });
    }

    const persistedInsightKeys = new Set(
      latestInsightSnapshots.map((item) => `${item.type}:${item.title}:${item.action}`)
    );
    const insightsToPersist = insights
      .filter((item) => !persistedInsightKeys.has(`${item.type}:${item.title}:${item.action}`))
      .slice(0, 6);

    if (insightsToPersist.length > 0) {
      await prisma.insight.createMany({
        data: insightsToPersist.map((insight) => ({
          type: insight.type,
          title: insight.title,
          content: insight.content,
          action: insight.action,
          confidence: insight.confidence,
          priority: insight.priority,
        })),
      });
    }

    const [decisionHistory, insightHistory, automatedAlertsSent] = await Promise.all([
      prisma.decisionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.insight.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      dispatchAutomatedAlerts(alerts, 45 * 60 * 1000),
    ]);

    logInfo("DECISION", "decision_log_saved", {
      metric: logMetric.metric,
      value: logMetric.value,
      priority: decision.priority,
      created: shouldPersistDecision,
    });
    logInfo("INSIGHT", "admin_insights_generated", {
      alerts: alerts.length,
      insights: insights.length,
      crisisEvents: crisisStats.total,
      automatedAlertsSent,
    });

    return NextResponse.json({
      metrics: {
        retentionDay3,
        retentionDay7,
        dropOffPoint,
        checkinDrop,
        dominantState,
        confidence,
        sampleSize: totalUsers,
      },
      activity: {
        usersCreatedLast7d,
        activeUsersLast7d: activeUsers.length,
        messagesLast7d: recentMessages.length,
        checkinsLast7d: totalCheckinsLast7d,
      },
      segments: {
        totalUsers,
        newUsers,
        returningUsers,
        activeNewUsers,
        activeReturningUsers,
        inactiveUsers,
      },
      decision: {
        decision: decision.decision,
        reason: decision.reason,
        priority: decision.priority,
        action: decision.action,
      },
      alerts,
      insights,
      crisis: {
        last24h: crisis24h,
        latestEvents: recentCrisisEvents24h.map((event) => ({
          userId: event.userId,
          level: event.level,
          message: truncateMessage(event.message),
          createdAt: event.createdAt,
        })),
      },
      avoidance: {
        last7d: {
          total: avoidanceStats.total,
          postpone: avoidanceStats.postpone,
          refuse: avoidanceStats.refuse,
          uniqueUsers: avoidanceStats.uniqueUsers,
        },
        topActions: topAvoidedActions.map((item) => ({
          actionId: item.actionId,
          description: item.description,
          goalTitle: item.goalTitle,
          total: item.total,
          postpone: item.postpone,
          refuse: item.refuse,
        })),
      },
      decisionHistory: decisionHistory.map((item) => ({
        id: item.id,
        metric: item.metric,
        value: item.value,
        decision: item.decision,
        createdAt: item.createdAt.toISOString(),
      })),
      insightHistory: insightHistory.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        action: item.action,
        priority: item.priority,
        confidence: item.confidence,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    logError("DECISION", error, { route: "/api/admin/insights" });
    return NextResponse.json(
      {
        metrics: {
          retentionDay3: 0,
          retentionDay7: 0,
          dropOffPoint: "day_1",
          checkinDrop: 0,
          dominantState: "neutral",
        },
        activity: {
          usersCreatedLast7d: 0,
          activeUsersLast7d: 0,
          messagesLast7d: 0,
          checkinsLast7d: 0,
        },
        segments: {
          totalUsers: 0,
          newUsers: 0,
          returningUsers: 0,
          activeNewUsers: 0,
          activeReturningUsers: 0,
          inactiveUsers: 0,
        },
        decision: {
          decision: "Error en motor de decisiones",
          reason: "No se pudieron calcular métricas",
          priority: "high",
          action: "Revisar logs y conectividad de base de datos",
        },
        alerts: [],
        insights: [],
        crisis: {
          last24h: {
            total: 0,
            high: 0,
            critical: 0,
          },
          latestEvents: [],
        },
        avoidance: {
          last7d: {
            total: 0,
            postpone: 0,
            refuse: 0,
            uniqueUsers: 0,
          },
          topActions: [],
        },
        decisionHistory: [],
        insightHistory: [],
      },
      { status: 500 }
    );
  }
}
