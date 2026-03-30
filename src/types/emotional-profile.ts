export const PRIMARY_EMOTIONS = [
  "ansiedad",
  "apatía",
  "confusión",
  "frustración",
  "calma",
] as const;

export const DOMINANT_PATTERNS = [
  "evita_decidir",
  "perfeccionismo",
  "comparación",
  "miedo_al_error",
  "procrastinación",
] as const;

export const FOCUS_AREAS = [
  "estudios",
  "trabajo",
  "propósito",
  "relaciones",
  "autoestima",
] as const;

export const ENERGY_LEVELS = ["bajo", "medio", "alto"] as const;

export const EMOTIONAL_RISK_LEVELS = ["low", "medium", "high"] as const;

export const PROGRESS_TRENDS = ["mejora", "igual", "empeora"] as const;

export type PrimaryEmotion = (typeof PRIMARY_EMOTIONS)[number];
export type DominantPattern = (typeof DOMINANT_PATTERNS)[number];
export type FocusArea = (typeof FOCUS_AREAS)[number];
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];
export type EmotionalRiskLevel = (typeof EMOTIONAL_RISK_LEVELS)[number];
export type ProgressTrend = (typeof PROGRESS_TRENDS)[number];

export type EmotionalProfile = {
  primaryEmotion: PrimaryEmotion;
  dominantPattern: DominantPattern;
  focusArea: FocusArea;
  energyLevel: EnergyLevel;
  riskLevel: EmotionalRiskLevel;
  progressTrend: ProgressTrend;
};

export const DEFAULT_EMOTIONAL_PROFILE: EmotionalProfile = {
  primaryEmotion: "calma",
  dominantPattern: "evita_decidir",
  focusArea: "propósito",
  energyLevel: "medio",
  riskLevel: "low",
  progressTrend: "igual",
};
