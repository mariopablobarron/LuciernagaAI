import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { generateDecision, type DecisionMetrics } from "@/services/decision";
import { generateInsights } from "@/services/insights";
import { getDominantState } from "@/services/state";

export const dynamic = "force-dynamic";

type AlertItem = {
  type: "critical" | "warning";
  title: string;
  message: string;
};

function buildAlerts(metrics: DecisionMetrics): AlertItem[] {
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

export async function GET() {
  try {
    const prisma = getPrismaClient();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const usersCreatedLast7d = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
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

    const totalCheckinsLast7d = await prisma.dailyCheckin.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const recentMessages = await prisma.message.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { content: true },
      take: 300,
      orderBy: { createdAt: "desc" },
    });

    const statesFromMessages = recentMessages.map((m) => m.content);
    const dominantState = getDominantState(statesFromMessages);

    const retentionDay3 =
      usersCreatedLast7d > 0 ? usersWithCheckinDay3.length / usersCreatedLast7d : 0;
    const retentionDay7 =
      usersCreatedLast7d > 0 ? usersActiveLast7d.length / usersCreatedLast7d : 0;

    const expectedCheckins = Math.max(usersActiveLast7d.length * 7, 1);
    const checkinDrop = Math.max(0, 1 - totalCheckinsLast7d / expectedCheckins);

    const dropOffPoint =
      retentionDay3 < 0.25 ? "day_1" : retentionDay3 < 0.4 ? "day_3" : "day_7";

    const metrics: DecisionMetrics = {
      retentionDay3,
      retentionDay7,
      dropOffPoint,
      checkinDrop,
      dominantState,
    };

    const decision = generateDecision(metrics, dominantState);
    const insights = generateInsights({
      messages: statesFromMessages,
      retentionDay3,
      retentionDay7,
      checkinDrop,
      dropOffPoint,
      dominantState,
    });
    const alerts = buildAlerts(metrics);

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
    });

    return NextResponse.json({
      metrics: {
        retentionDay3,
        retentionDay7,
        dropOffPoint,
        checkinDrop,
        dominantState,
      },
      decision: {
        decision: decision.decision,
        reason: decision.reason,
        priority: decision.priority,
        action: decision.action,
      },
      alerts,
      insights,
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
      },
      { status: 500 }
    );
  }
}
