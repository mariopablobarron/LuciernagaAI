export type DiagnosticCategory =
  | "claridad"
  | "autoestima"
  | "energia"
  | "disciplina"
  | "social";

export type DiagnosticPolarity = "positive" | "negative";

export type ImpulseProfileCode =
  | "BLOQUEADO"
  | "ANSIOSO"
  | "DESMOTIVADO"
  | "PERDIDO"
  | "POTENCIAL_ALTO";

export type ChallengeType =
  | "claridad"
  | "energia"
  | "disciplina"
  | "social"
  | "ejecucion";

export type DiagnosticQuestion = {
  id: string;
  category: DiagnosticCategory;
  prompt: string;
  polarity: DiagnosticPolarity;
  scaleLabels: [string, string, string, string, string];
};

export type DiagnosticAnswerMap = Record<string, number>;

export type DiagnosticScores = Record<DiagnosticCategory, number> & {
  total: number;
};

export type ImpulseProfileDefinition = {
  code: ImpulseProfileCode;
  type: string;
  title: string;
  description: string;
  operationalFocus: string;
};

export type ImpulseProfileSnapshot = {
  code: ImpulseProfileCode;
  title: string;
  type: string;
  description: string;
  operationalFocus: string;
  scores: DiagnosticScores;
  assignedAt: string;
};

export type ImpulseChallengeSnapshot = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: number;
  durationDays: number;
  estimatedMinutes: number;
  instructions: string;
  successMetric: string;
  status: string;
  progress: number;
  completedDays: number;
  totalDays: number;
  startedAt: string;
  endsAt: string | null;
  validationNote: string | null;
};

export type StreakSnapshot = {
  currentDays: number;
  bestDays: number;
  lastCheckInDate: string | null;
  status: string;
};

export type DailyImpulseLogSnapshot = {
  id: string;
  emotionalState: string | null;
  note: string | null;
  mood: string | null;
  challengeStatus: string | null;
  momentum: number | null;
  createdAt: string;
};

export type ImpulseInsight = {
  type: "behavior";
  title: string;
  action: string;
  evidence?: string[];
};
