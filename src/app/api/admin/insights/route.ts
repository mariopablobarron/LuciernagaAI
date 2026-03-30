import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
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
  crisisStats: { total: number; high: number; critical: number }
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

  if (metrics.dominantState === "bloqueado") {
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

  return alerts;
}

function getDecisionMetricForLog(metrics: DecisionMetrics): { metric: string; value: number } {
  if (metrics.retentionDay3 < 0.4) {
    return { metric: "retentionDay3", value: metrics.retentionDay3 };
  }

  if (metrics.checkinDrop > 0.6) {
    return { metric: "checkinDrop", value: metrics.checkinDrop };
  }

  if (metrics.dominantState === "bloqueado") {
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

    const usersWithCheckinDay3 = await prisma.dailyCheckin.findMany({
      where: { createdAt: { gte: threeDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const usersActiveLast7d = await prisma.dailyCheckin.findMany({
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
    const crisis24h = {
      total: recentCrisisEvents24h.length,
      high: recentCrisisEvents24h.filter((event) => event.level === "high").length,
      critical: recentCrisisEvents24h.filter((event) => event.level === "critical").length,
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
    });
    const alerts = buildAlerts(metrics, crisisStats);

    const logMetric = getDecisionMetricForLog(metrics);
    await prisma.decisionLog.create({
      data: {
        metric: logMetric.metric,
        value: logMetric.value,
        decision: decision.decision,
      },
    });

    logInfo("DECISION", "decision_log_saved", {
      metric: logMetric.metric,
      value: logMetric.value,
      priority: decision.priority,
    });
    logInfo("INSIGHT", "admin_insights_generated", {
      alerts: alerts.length,
      insights: insights.length,
      crisisEvents: crisisStats.total,
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
      },
      { status: 500 }
    );
  }
}
