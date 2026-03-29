export interface Metrics {
  retentionDay3: number;
  retentionDay7: number;
  dropOffPoint: string;
  checkinDrop: number;
  dominantState: string;
  totalUsers: number;
  activeUsers: number;
}

export function generateDecision(metrics: Metrics): {
  decision: string;
  priority: "high" | "medium" | "low";
  metric: string;
  value: number;
} {
  // Retención crítica
  if (metrics.retentionDay3 < 0.3) {
    return {
      decision: "Crisis de onboarding: Eliminar 50% de fricción inicial",
      priority: "high",
      metric: "retentionDay3",
      value: metrics.retentionDay3,
    };
  }

  if (metrics.retentionDay3 < 0.4) {
    return {
      decision: "Reducir onboarding a máximo 3 pasos claros",
      priority: "high",
      metric: "retentionDay3",
      value: metrics.retentionDay3,
    };
  }

  // Check-in abandono
  if (metrics.checkinDrop > 0.7) {
    return {
      decision: "Check-in demasiado complejo: Reducir tiempo a 2 minutos",
      priority: "high",
      metric: "checkinDrop",
      value: metrics.checkinDrop,
    };
  }

  if (metrics.checkinDrop > 0.5) {
    return {
      decision: "Simplificar interacción diaria: Menos preguntas, más acción",
      priority: "medium",
      metric: "checkinDrop",
      value: metrics.checkinDrop,
    };
  }

  // Estado dominante
  if (metrics.dominantState === "bloqueado") {
    return {
      decision: "Mayoría bloqueada: Agregar acciones pequeñas y ejecutables",
      priority: "high",
      metric: "dominantState",
      value: 0,
    };
  }

  if (metrics.dominantState === "ansioso") {
    return {
      decision: "Usuarios ansiosos: Enfatizar calma y pasos pequeños",
      priority: "medium",
      metric: "dominantState",
      value: 0,
    };
  }

  // Si todo bien
  if (metrics.retentionDay3 > 0.7 && metrics.checkinDrop < 0.3) {
    return {
      decision: "Sistema estable: Mantener y iterar en features",
      priority: "low",
      metric: "overall",
      value: metrics.retentionDay3,
    };
  }

  // Default
  return {
    decision: "Sistema operativo: Monitorear métricas",
    priority: "low",
    metric: "overall",
    value: 0,
  };
}
