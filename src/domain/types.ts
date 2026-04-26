// Estado emocional/conversacional — detectado del texto del usuario
export type UserState = "neutral" | "duda" | "bloqueo" | "ansiedad" | "claridad";

// Estado sistémico/conductual — derivado de métricas de engagement
export type SystemState = "CRISIS" | "BLOQUEADO" | "EVASIVO" | "ESTABLE" | "ACTIVO" | "TRANSITIONAL_VOID";

export type EventType =
  | "MESSAGE_SENT"
  | "MESSAGE_RECEIVED"
  | "ACTION_CREATED"
  | "ACTION_COMPLETED"
  | "ACTION_SKIPPED"
  | "GOAL_CREATED"
  | "GOAL_COMPLETED"
  | "CRISIS_DETECTED"
  | "CRISIS_EXITED"
  | "AVOIDANCE_DETECTED"
  | "USER_ONBOARDED"
  | "CHECKIN_SUBMITTED"
  | "PROFILE_COMPLETED"
  | "TRANSITIONAL_VOID_DETECTED"
  | "NUDGE_7D_SENT"
  | "ENNEAGRAM_COMPLETED"
  | "TEAM_LETTER_REQUESTED";

export type DecisionType =
  | "ESCALAR_CRISIS"
  | "DESTRABAR_BLOQUEO"
  | "REDUCIR_EVASION"
  | "ACELERAR_ACCION"
  | "MANTENER_RUMBO"
  | "SOSTENER_VACIO";

export interface Insight {
  retentionDay3: number;
  retentionDay7: number;
  checkinDrop: number;
  avoidanceRate: number;
  actionCompletionRate: number;
  crisisCount: number;
  // TRANSITIONAL_VOID detection — derived from message text analysis
  confusionScore?: number;   // 0–1: proportion of uncertainty/confusion signals
  identityShift?: boolean;   // true if identity-dissolution keywords detected
  directionClarity?: number; // 0–1: inverse of confusion, proxy for directional clarity
}

export interface Decision {
  type: DecisionType;
  reason: string;
  confidence: "low" | "medium" | "high";
  recommendedActions: string[];
}
