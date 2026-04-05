export type InterventionType = "message" | "recommendation" | "resource" | "assessment";
export type InterventionStatus = "sent" | "read" | "resolved";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EmotionalState = "neutral" | "duda" | "bloqueo" | "ansiedad" | "claridad";

export interface ClinicalUserListItem {
  id: string;
  email: string;
  name: string | null;
  lastSeen: string;
  state: EmotionalState;
  riskLevel: RiskLevel;
  crisisActive: boolean;
  streakDays: number;
  crisisEvents7d: number;
  interventions: number;
  lastInterventionAt: string | null;
}

export interface ClinicalUserDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    lastSeen: string;
    source: string | null;
  };
  state: {
    state: EmotionalState;
    riskLevel: RiskLevel;
    crisisActive: boolean;
    crisisActivatedAt: string | null;
    mood: string | null;
    primaryEmotion: string | null;
    dominantPattern: string | null;
    focusArea: string | null;
    energyLevel: string | null;
    progressTrend: string | null;
    updatedAt: string;
  } | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  emotionalProfile: {
    clarityScore: number;
    autoestimaScore: number;
    energiaScore: number;
    disciplinaScore: number;
    socialScore: number;
    totalScore: number;
  } | null;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    actions: Array<{ id: string; description: string; completed: boolean }>;
  }>;
  crisisEvents: Array<{
    id: string;
    level: string;
    message: string;
    response: string;
    createdAt: string;
  }>;
  interventions: Array<{
    id: string;
    adminId: string;
    type: InterventionType;
    content: string;
    status: InterventionStatus;
    sentAt: string;
    readAt: string | null;
  }>;
}

export interface SendInterventionInput {
  userId: string;
  type: InterventionType;
  content: string;
  notify?: boolean;
}
