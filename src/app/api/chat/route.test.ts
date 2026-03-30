jest.mock("@/lib/auth", () => {
  class MockInvalidSessionTokenError extends Error {
    constructor() {
      super("Invalid or expired session token");
      this.name = "InvalidSessionTokenError";
    }
  }

  return {
    InvalidSessionTokenError: MockInvalidSessionTokenError,
    resolveIdentity: jest.fn(),
    attachSessionCookie: jest.fn(),
    clearSessionCookie: jest.fn(),
  };
});

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/services/conversation", () => ({
  ensureUserSession: jest.fn(),
  resolveConversationForUser: jest.fn(),
  saveConversationMessage: jest.fn(),
}));

jest.mock("@/services/goals", () => ({
  createGoalFromIntentMessage: jest.fn(),
  getActiveGoalForUser: jest.fn(),
}));

jest.mock("@/services/state", () => ({
  detectUserState: jest.fn(),
  updateUserState: jest.fn(),
}));

jest.mock("@/services/ai", () => ({
  generateAIResponse: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { InvalidSessionTokenError, resolveIdentity, clearSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ensureUserSession,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { createGoalFromIntentMessage, getActiveGoalForUser } from "@/services/goals";
import { detectUserState, updateUserState } from "@/services/state";
import { generateAIResponse } from "@/services/ai";

describe("POST /api/chat", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterAll(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  it("permite acceso autenticado y responde 200", async () => {
    (resolveIdentity as jest.Mock).mockReturnValue({
      userId: "usr_test_1",
      source: "session",
      sessionToken: "token",
      shouldSetCookie: false,
    });
    (checkRateLimit as jest.Mock).mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
      limit: 10,
      remaining: 9,
    });
    (ensureUserSession as jest.Mock).mockResolvedValue(undefined);
    (detectUserState as jest.Mock).mockReturnValue("neutral");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (createGoalFromIntentMessage as jest.Mock).mockResolvedValue(null);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(null);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (generateAIResponse as jest.Mock).mockResolvedValue({
      response: "Respuesta de prueba",
      fallback: false,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Hola mentor" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.conversationId).toBe("conv_1");
    expect(body.response).toBe("Respuesta de prueba");
  });

  it("retorna 401 cuando no hay sesión válida", async () => {
    (resolveIdentity as jest.Mock).mockImplementation(() => {
      throw new InvalidSessionTokenError();
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Hola mentor" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("INVALID_SESSION_TOKEN");
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});
