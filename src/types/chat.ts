export type UserState = "neutral" | "perdido" | "ansioso" | "bloqueado";

export interface ChatRequestBody {
  message: string;
  userId?: string;
  conversationId?: string;
}

export interface ChatResponseBody {
  response: string;
  state: UserState;
  conversationId?: string;
  fallback?: boolean;
  timestamp: string;
}
