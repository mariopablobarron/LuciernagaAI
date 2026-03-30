import { logInfo } from "@/lib/logger";

export type InsightConfidence = "low" | "medium" | "high";

export interface InsightItem {
  type: "clarity" | "retention" | "engagement" | "state";
  title: string;
  content: string;
  action: string;
  priority: "low" | "medium" | "high";
  confidence: InsightConfidence;
}

export interface InsightsInput {
  messages: string[];
  retentionDay3: number;
  retentionDay7: number;
  checkinDrop: number;
  dropOffPoint: string;
  dominantState: string;
  totalUsers: number;
  totalMessages: number;
  totalCheckinsLast7d: number;
  expectedCheckinsLast7d: number;
  segments: {
    newUsers: number;
    returningUsers: number;
    inactiveUsers: number;
    activeNewUsers: number;
    activeReturningUsers: number;
  };
  avoidance: {
    totalLast7d: number;
    postponeLast7d: number;
    refuseLast7d: number;
    uniqueUsers: number;
    topActionTitle: string | null;
  };
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getInsightConfidence(input: {
  totalUsers: number;
  totalMessages: number;
  totalCheckinsLast7d: number;
}): InsightConfidence {
  if (input.totalUsers < 10) {
    return "low";
  }

  if (input.totalUsers < 30 || input.totalMessages < 50 || input.totalCheckinsLast7d < 20) {
    return "medium";
  }

  return "high";
}

function countConfusionMessages(messages: string[]): number {
  const patterns = ["no sé", "no se", "confund", "no entiendo", "duda", "no tengo claro"];
  return messages.filter((msg) => {
    const lower = msg.toLowerCase();
    return patterns.some((pattern) => lower.includes(pattern));
  }).length;
}

export function generateInsights(data: InsightsInput): InsightItem[] {
  const insights: InsightItem[] = [];
  const confusionCount = countConfusionMessages(data.messages);
  const confidence = getInsightConfidence({
    totalUsers: data.totalUsers,
    totalMessages: data.totalMessages,
    totalCheckinsLast7d: data.totalCheckinsLast7d,
  });

  const inactiveShare = data.totalUsers > 0 ? data.segments.inactiveUsers / data.totalUsers : 0;
  const newUsersRetention =
    data.segments.newUsers > 0 ? data.segments.activeNewUsers / data.segments.newUsers : 0;

  if (data.retentionDay3 < 0.4) {
    insights.push({
      type: "retention",
      title: "Retención D3 crítica",
      content:
        `Retención D3 estimada en ${toPercent(data.retentionDay3)} ` +
        `con ${data.totalUsers} usuarios totales y ${data.segments.newUsers} nuevos en los últimos 3 días.`,
      action:
        data.segments.newUsers > 0
          ? `Solo ${data.segments.activeNewUsers}/${data.segments.newUsers} nuevos usuarios regresan tras el arranque. ` +
            "Reduce onboarding a 1 objetivo + 1 acción concreta en el primer turno."
          : "Aún no hay cohorte nueva suficiente; prioriza capturar más datos de onboarding.",
      priority: confidence === "low" ? "medium" : "high",
      confidence,
    });
  }

  if (data.checkinDrop > 0.6) {
    insights.push({
      type: "engagement",
      title: "Abandono alto en check-ins",
      content:
        `Check-in drop estimado en ${toPercent(data.checkinDrop)} ` +
        `(realizados ${data.totalCheckinsLast7d} de ${Math.round(data.expectedCheckinsLast7d)} esperados).`,
      action:
        "Simplifica el check-in diario a una sola pregunta y cierra siempre con una microacción de hoy.",
      priority: confidence === "low" ? "medium" : "high",
      confidence,
    });
  }

  if (data.dominantState === "bloqueo") {
    insights.push({
      type: "state",
      title: "Predomina estado de bloqueo",
      content: `El estado dominante es bloqueo en una muestra de ${data.totalMessages} mensajes recientes.`,
      action: "Forzar respuestas de microacción en el primer turno del coach.",
      priority: "medium",
      confidence,
    });
  }

  if (confusionCount >= 3) {
    insights.push({
      type: "clarity",
      title: "Patrón de confusión detectado",
      content: `${confusionCount}/${Math.max(data.totalMessages, 1)} mensajes recientes incluyen señales de confusión explícita.`,
      action: "Mejorar claridad del primer mensaje y confirmar objetivo del usuario.",
      priority: "medium",
      confidence,
    });
  }

  if (data.segments.inactiveUsers > 0) {
    insights.push({
      type: "engagement",
      title: "Segmento inactivo significativo",
      content: `${data.segments.inactiveUsers}/${data.totalUsers} usuarios (${toPercent(inactiveShare)}) no registran check-in en 7 días.`,
      action:
        "Activar reenganche para inactivos con recordatorio corto y una pregunta de fricción principal.",
      priority: inactiveShare > 0.5 && confidence !== "low" ? "high" : "medium",
      confidence,
    });
  }

  if (data.segments.newUsers > 0) {
    insights.push({
      type: "retention",
      title: "Rendimiento del segmento nuevo",
      content: `${data.segments.activeNewUsers}/${data.segments.newUsers} usuarios nuevos permanecen activos (${toPercent(newUsersRetention)}).`,
      action:
        "Crear flujo de primeros 3 días con objetivo guiado, check-in breve y cierre de acción concreta.",
      priority: newUsersRetention < 0.35 && confidence !== "low" ? "high" : "medium",
      confidence,
    });
  }

  if (data.segments.returningUsers > 0) {
    insights.push({
      type: "engagement",
      title: "Base recurrente activa",
      content: `${data.segments.activeReturningUsers}/${data.segments.returningUsers} usuarios recurrentes siguen activos esta semana.`,
      action: "Usar este segmento para validar mejoras antes de escalar cambios al onboarding.",
      priority: "low",
      confidence,
    });
  }

  if (data.avoidance.totalLast7d > 0) {
    insights.push({
      type: "engagement",
      title: "Evitación activa detectada",
      content:
        `${data.avoidance.totalLast7d} eventos de evitación en 7 días ` +
        `(${data.avoidance.postponeLast7d} postergaciones, ${data.avoidance.refuseLast7d} rechazos) ` +
        `repartidos entre ${data.avoidance.uniqueUsers} usuario(s).`,
      action: data.avoidance.topActionTitle
        ? `Revisa la fricción de la acción más evitada: ${data.avoidance.topActionTitle}.`
        : "Revisa la fricción de las acciones pendientes y reduce su coste de entrada.",
      priority: data.avoidance.refuseLast7d >= 2 ? "high" : "medium",
      confidence,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "retention",
      title: "Sistema estable",
      content: "No se detectaron desviaciones críticas en los últimos datos.",
      action: "Mantener estrategia actual y monitorizar cohortes semanalmente.",
      priority: "low",
      confidence,
    });
  }

  logInfo("INSIGHT", "insights_generated", { count: insights.length, confidence });
  return insights;
}
