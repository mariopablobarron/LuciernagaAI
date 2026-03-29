export type UserState = "neutral" | "perdido" | "ansioso" | "bloqueado";

export interface ChatRequestBody {
  message: string;
  userId?: string;
}

export interface ChatResponseBody {
  response: string;
  state: UserState;
  fallback?: boolean;
  timestamp: string;
}
