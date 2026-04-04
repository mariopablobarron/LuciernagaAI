import type { Insight, SystemState } from "@/domain/types";

function clampRate(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function buildUserState(insight: Insight): SystemState {
  const retentionDay3 = clampRate(insight.retentionDay3);
  const checkinDrop = clampRate(insight.checkinDrop);
  const avoidanceRate = clampRate(insight.avoidanceRate);
  const actionCompletionRate = clampRate(insight.actionCompletionRate);

  if (insight.crisisCount > 0) {
    return "CRISIS" as const;
  }

  if (retentionDay3 < 0.35 || checkinDrop > 0.7) {
    return "BLOQUEADO" as const;
  }

  if (avoidanceRate >= 0.5) {
    return "EVASIVO" as const;
  }

  if (actionCompletionRate >= 0.55 && checkinDrop < 0.45) {
    return "ACTIVO" as const;
  }

  return "ESTABLE" as const;
}
