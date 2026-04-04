// Estado emocional/conversacional — detectado del texto del usuario
export type UserState = "neutral" | "duda" | "bloqueo" | "ansiedad" | "claridad";

// Estado sistémico/conductual — derivado de métricas de engagement
export type SystemState = "CRISIS" | "BLOQUEADO" | "EVASIVO" | "ESTABLE" | "ACTIVO";

export type EventType =
  | "MESSAGE_SENT"
  | "MESSAGE_RECEIVED"
  | "ACTION_CREATED"
  | "ACTION_COMPLETED"
  | "ACTION_SKIPPED"
  | "GOAL_CREATED"
  | "GOAL_COMPLETED"
  | "CRISIS_DETECTED"
  | "AVOIDANCE_DETECTED"
  | "USER_ONBOARDED"
  | "CHECKIN_SUBMITTED"
  | "PROFILE_COMPLETED";

export type DecisionType =
  | "ESCALAR_CRISIS"
  | "DESTRABAR_BLOQUEO"
  | "REDUCIR_EVASION"
  | "ACELERAR_ACCION"
  | "MANTENER_RUMBO";

export interface Insight {
  retentionDay3: number;
  retentionDay7: number;
  checkinDrop: number;
  avoidanceRate: number;
  actionCompletionRate: number;
  crisisCount: number;
}

export interface Decision {
  type: DecisionType;
  reason: string;
  confidence: "low" | "medium" | "high";
  recommendedActions: string[];
}
