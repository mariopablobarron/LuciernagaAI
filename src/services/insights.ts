import { logInfo } from "@/lib/logger";

export interface InsightItem {
  type: "clarity" | "retention" | "engagement" | "state";
  title: string;
  content: string;
  action: string;
  priority: "low" | "medium" | "high";
}

export interface InsightsInput {
  messages: string[];
  retentionDay3: number;
  retentionDay7: number;
  checkinDrop: number;
  dropOffPoint: string;
  dominantState: string;
}

function countConfusionMessages(messages: string[]): number {
  const patterns = ["no sé", "no se", "confund", "no entiendo", "perdido"];
  return messages.filter((msg) => {
    const lower = msg.toLowerCase();
    return patterns.some((pattern) => lower.includes(pattern));
  }).length;
}

export function generateInsights(data: InsightsInput): InsightItem[] {
  const insights: InsightItem[] = [];
  const confusionCount = countConfusionMessages(data.messages);

  if (data.retentionDay3 < 0.4) {
    insights.push({
      type: "retention",
      title: "Retención D3 crítica",
      content: `Retención D3 en ${(data.retentionDay3 * 100).toFixed(1)}%.`,
      action: "Reducir el onboarding a pasos mínimos y seguimiento de primera sesión.",
      priority: "high",
    });
  }

  if (data.checkinDrop > 0.6) {
    insights.push({
      type: "engagement",
      title: "Abandono alto en check-ins",
      content: `Checkin drop en ${(data.checkinDrop * 100).toFixed(1)}%.`,
      action: "Simplificar interacción diaria con una sola pregunta principal.",
      priority: "high",
    });
  }

  if (data.dominantState === "bloqueado") {
    insights.push({
      type: "state",
      title: "Predomina estado bloqueado",
      content: "El patrón emocional dominante es bloqueo/parálisis.",
      action: "Forzar respuestas de microacción en el primer turno del coach.",
      priority: "medium",
    });
  }

  if (confusionCount >= 3) {
    insights.push({
      type: "clarity",
      title: "Patrón de confusión detectado",
      content: `${confusionCount} mensajes recientes muestran confusión explícita.`,
      action: "Mejorar claridad del primer mensaje y confirmar objetivo del usuario.",
      priority: "medium",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "retention",
      title: "Sistema estable",
      content: "No se detectaron desviaciones críticas en los últimos datos.",
      action: "Mantener estrategia actual y monitorizar cohortes semanalmente.",
      priority: "low",
    });
  }

  logInfo("INSIGHT", "insights_generated", { count: insights.length });
  return insights;
}
