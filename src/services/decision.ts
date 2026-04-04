import { logInfo } from "@/lib/logger";
import type { UserState } from "@/domain/types";
import type { InsightConfidence } from "@/services/insights";

export interface DecisionMetrics {
  retentionDay3: number;
  retentionDay7: number;
  dropOffPoint: string;
  checkinDrop: number;
  dominantState: string;
  avoidanceTotalLast7d?: number;
  repeatPatternUsers?: number;
  confidence?: InsightConfidence;
}

export interface DecisionResult {
  decision: string;
  reason: string;
  priority: "low" | "medium" | "high";
  action: string;
}

function normalizeState(state: string): UserState {
  if (
    state === "neutral" ||
    state === "bloqueo" ||
    state === "ansiedad" ||
    state === "duda" ||
    state === "claridad"
  ) {
    return state;
  }

  if (state === "bloqueado") return "bloqueo";
  if (state === "ansioso") return "ansiedad";
  if (state === "perdido") return "duda";
  return "neutral";
}

export function generateDecision(metrics: DecisionMetrics, userState: string): DecisionResult {
  const normalizedUserState = normalizeState(userState);
  const confidence = metrics.confidence ?? "medium";

  if (confidence === "low") {
    const result: DecisionResult = {
      decision: "Recoger más datos antes de intervenir",
      reason:
        "La muestra actual es insuficiente para activar una decisión de alta prioridad con seguridad.",
      priority: "medium",
      action:
        "Aumentar muestra de usuarios/check-ins durante 7 días y re-evaluar reglas con mayor confianza.",
    };
    logInfo("DECISION", "decision_generated", { trigger: "low_confidence", result });
    return result;
  }

  if (metrics.retentionDay3 < 0.4) {
    const result: DecisionResult = {
      decision: "Intervenir onboarding de forma inmediata",
      reason: `Retention Day 3 crítica (${(metrics.retentionDay3 * 100).toFixed(1)}%)`,
      priority: "high",
      action:
        "Reducir fricción inicial, simplificar primeros 3 pasos y activar seguimiento proactivo.",
    };
    logInfo("DECISION", "decision_generated", { trigger: "retentionDay3", result });
    return result;
  }

  if (metrics.checkinDrop > 0.6) {
    const result: DecisionResult = {
      decision: "Simplificar interacción diaria",
      reason: `Check-in drop elevado (${(metrics.checkinDrop * 100).toFixed(1)}%)`,
      priority: "high",
      action:
        "Reducir número de preguntas por check-in y ofrecer respuesta guiada con un solo clic.",
    };
    logInfo("DECISION", "decision_generated", { trigger: "checkinDrop", result });
    return result;
  }

  if ((metrics.avoidanceTotalLast7d ?? 0) >= 8 || (metrics.repeatPatternUsers ?? 0) >= 3) {
    const result: DecisionResult = {
      decision: "Subir confrontación de responsabilidad",
      reason:
        "Se detecta evitación repetida o patrón sostenido de no ejecución en la base activa.",
      priority: "high",
      action:
        "Reducir validación complaciente, reforzar seguimiento de acciones abiertas y activar mensajes binarios de compromiso.",
    };
    logInfo("DECISION", "decision_generated", { trigger: "avoidance", result });
    return result;
  }

  if (metrics.dominantState === "bloqueo") {
    const result: DecisionResult = {
      decision: "Activar estrategia de microacciones",
      reason: "El estado dominante del sistema es bloqueo",
      priority: "medium",
      action: "Forzar respuestas con microacciones de 5-10 minutos y seguimiento al primer paso.",
    };
    logInfo("DECISION", "decision_generated", { trigger: "dominantState", result });
    return result;
  }

  const stable = metrics.retentionDay3 >= 0.4 && metrics.checkinDrop <= 0.6;
  if (stable) {
    const result: DecisionResult = {
      decision: "Sistema estable",
      reason: `Métricas dentro de umbral y usuario actual en estado ${normalizedUserState}`,
      priority: "low",
      action: "Mantener estrategia actual y optimizar incrementalmente los prompts.",
    };
    logInfo("DECISION", "decision_generated", { trigger: "stable", result });
    return result;
  }

  const result: DecisionResult = {
    decision: "Ajuste táctico",
    reason: "Se detectaron variaciones menores que requieren observación",
    priority: "medium",
    action: "Monitorizar cohortes 7 días y re-evaluar reglas en próximo ciclo.",
  };
  logInfo("DECISION", "decision_generated", { trigger: "fallback", result });
  return result;
}
