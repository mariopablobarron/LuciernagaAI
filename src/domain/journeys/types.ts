/**
 * Domain types for the Journey (Itinerarios) system.
 * Pure types — no external dependencies.
 */

export type JourneyPhase =
  | "autoconocimiento"
  | "gestion_emocional"
  | "proposito"
  | "accion";

export const JOURNEY_PHASES: readonly JourneyPhase[] = [
  "autoconocimiento",
  "gestion_emocional",
  "proposito",
  "accion",
] as const;

export const JOURNEY_PHASE_LABELS: Record<JourneyPhase, string> = {
  autoconocimiento: "Autoconocimiento",
  gestion_emocional: "Gestión Emocional",
  proposito: "Propósito y Dirección",
  accion: "Acción y Seguimiento",
};

export type ExerciseType =
  | "reflection"
  | "writing"
  | "action"
  | "assessment"
  | "breathing"
  | "visualization";

export type ExerciseInputType = "text" | "choice" | "scale" | "none";

export type ExerciseStep = {
  step: number;
  title: string;
  prompt: string;
  inputType: ExerciseInputType;
  options?: string[]; // for "choice" type
  scaleMin?: number;  // for "scale" type
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
};

export type ExerciseResponse = {
  stepIndex: number;
  answer: string | number;
};

export type UserJourneyStatus = "active" | "paused" | "completed" | "abandoned";
export type UserExerciseStatus = "pending" | "in_progress" | "completed" | "skipped";

export type JourneyProgressSummary = {
  journeyId: string;
  journeyTitle: string;
  journeyPhase: JourneyPhase;
  status: UserJourneyStatus;
  progress: number;
  totalModules: number;
  completedModules: number;
  totalExercises: number;
  completedExercises: number;
  currentModule: {
    id: string;
    title: string;
    order: number;
  } | null;
  nextExercise: {
    id: string;
    title: string;
    type: ExerciseType;
    estimatedMinutes: number;
  } | null;
};

export type ModuleWithExercises = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  iconEmoji: string;
  unlocked: boolean;
  exercises: Array<{
    id: string;
    slug: string;
    title: string;
    type: ExerciseType;
    estimatedMinutes: number;
    status: UserExerciseStatus;
  }>;
  completedCount: number;
  totalCount: number;
};

export type JourneyMap = {
  id: string;
  slug: string;
  title: string;
  description: string;
  phase: JourneyPhase;
  iconEmoji: string;
  progress: number;
  status: UserJourneyStatus;
  modules: ModuleWithExercises[];
};

/**
 * Context block injected into the coach prompt when a user has an active journey.
 * This is the ONLY integration point with the existing chat system.
 */
export type JourneyCoachContext = {
  activeJourney: string;
  currentPhase: JourneyPhase;
  currentModule: string;
  progress: number;
  lastExercise: {
    title: string;
    type: ExerciseType;
    reflection: string | null;
    completedAt: string;
  } | null;
  nextExercise: {
    title: string;
    type: ExerciseType;
  } | null;
  exercisesCompletedTotal: number;
};
