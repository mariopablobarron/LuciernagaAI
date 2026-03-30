import type { EmotionalProfile } from "@/types/emotional-profile";

export type UserState = "neutral" | "duda" | "bloqueo" | "ansiedad" | "claridad";

export interface ChatRequestBody {
  message: string;
  conversationId?: string;
}

export interface ChatResponseBody {
  response: string;
  state: UserState;
  emotionalProfile?: EmotionalProfile;
  conversationId?: string;
  fallback?: boolean;
  timestamp: string;
}
