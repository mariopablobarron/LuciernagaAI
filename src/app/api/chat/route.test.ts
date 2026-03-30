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
  listRecentUserMessagesForUser: jest.fn(),
  resolveConversationForUser: jest.fn(),
  saveConversationMessage: jest.fn(),
}));

jest.mock("@/services/emotional-model", () => ({
  analyzeEmotionalProfile: jest.fn(),
  updateEmotionalProfile: jest.fn(),
}));

jest.mock("@/services/search", () => ({
  buildSearchQuery: jest.fn(),
  needsExternalInfo: jest.fn(),
  searchWeb: jest.fn(),
}));

jest.mock("@/services/goals", () => ({
  buildGoalCoachContext: jest.fn(),
  completeFirstPendingActionForUser: jest.fn(),
  createGoalFromIntentMessage: jest.fn(),
  detectActionCompletionIntent: jest.fn(),
  detectActionPostponeIntent: jest.fn(),
  detectActionRefusalIntent: jest.fn(),
  getFirstPendingAction: jest.fn(),
  getActiveGoalForUser: jest.fn(),
  registerAvoidanceEvent: jest.fn(),
}));

jest.mock("@/services/state", () => ({
  activateUserCrisis: jest.fn(),
  buildConversationContext: jest.fn(),
  clearUserCrisis: jest.fn(),
  detectUserState: jest.fn(),
  getUserCrisisStatus: jest.fn(),
  shouldBypassActionLock: jest.fn(),
  updateUserState: jest.fn(),
}));

jest.mock("@/services/ai", () => ({
  generateAIResponse: jest.fn(),
}));

jest.mock("@/services/risk", () => ({
  detectRiskLevel: jest.fn(),
  getCrisisResponse: jest.fn(),
  registerCrisisEvent: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { InvalidSessionTokenError, resolveIdentity, clearSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ensureUserSession,
  listRecentUserMessagesForUser,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import {
  buildGoalCoachContext,
  completeFirstPendingActionForUser,
  createGoalFromIntentMessage,
  detectActionCompletionIntent,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  getFirstPendingAction,
  getActiveGoalForUser,
  registerAvoidanceEvent,
} from "@/services/goals";
import { buildSearchQuery, needsExternalInfo, searchWeb } from "@/services/search";
import {
  activateUserCrisis,
  buildConversationContext,
  clearUserCrisis,
  detectUserState,
  getUserCrisisStatus,
  shouldBypassActionLock,
  updateUserState,
} from "@/services/state";
import { generateAIResponse } from "@/services/ai";
import { detectRiskLevel, getCrisisResponse, registerCrisisEvent } from "@/services/risk";

describe("POST /api/chat", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
    (analyzeEmotionalProfile as jest.Mock).mockReturnValue({
      primaryEmotion: "calma",
      dominantPattern: "evita_decidir",
      focusArea: "propósito",
      energyLevel: "medio",
      riskLevel: "low",
      progressTrend: "igual",
    });
    (updateEmotionalProfile as jest.Mock).mockResolvedValue({
      primaryEmotion: "calma",
      dominantPattern: "evita_decidir",
      focusArea: "propósito",
      energyLevel: "medio",
      riskLevel: "low",
      progressTrend: "igual",
    });
    (buildSearchQuery as jest.Mock).mockImplementation((message: string) => message);
    (needsExternalInfo as jest.Mock).mockReturnValue(false);
    (searchWeb as jest.Mock).mockResolvedValue([]);
    (buildGoalCoachContext as jest.Mock).mockReturnValue(null);
    (completeFirstPendingActionForUser as jest.Mock).mockResolvedValue(null);
    (detectActionCompletionIntent as jest.Mock).mockReturnValue(false);
    (detectActionPostponeIntent as jest.Mock).mockReturnValue(false);
    (detectActionRefusalIntent as jest.Mock).mockReturnValue(false);
    (getFirstPendingAction as jest.Mock).mockReturnValue(null);
    (activateUserCrisis as jest.Mock).mockResolvedValue(new Date("2026-03-30T12:00:00.000Z"));
    (buildConversationContext as jest.Mock).mockReturnValue({
      lastGoal: null,
      pendingActions: [],
      emotionalState: "neutral",
      summary: "Sin contexto previo.",
    });
    (clearUserCrisis as jest.Mock).mockResolvedValue(undefined);
    (detectRiskLevel as jest.Mock).mockReturnValue("low");
    (getCrisisResponse as jest.Mock).mockReturnValue({
      response: "Estoy contigo. Vamos paso a paso.",
      resources: [],
      shouldEscalate: false,
    });
    (getUserCrisisStatus as jest.Mock).mockResolvedValue({
      active: false,
      expiresAt: null,
      reason: "none",
    });
    (registerAvoidanceEvent as jest.Mock).mockResolvedValue(1);
    (shouldBypassActionLock as jest.Mock).mockReturnValue(false);
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["Hola mentor"]);
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
    expect(body.emotionalProfile.primaryEmotion).toBe("calma");
    expect(updateEmotionalProfile).toHaveBeenCalledTimes(1);
  });

  it("activa protocolo de crisis en riesgo crítico", async () => {
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["me quiero matar"]);
    (detectUserState as jest.Mock).mockReturnValue("ansiedad");
    (detectRiskLevel as jest.Mock).mockReturnValue("critical");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_crisis_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (getCrisisResponse as jest.Mock).mockReturnValue({
      response: "Tu seguridad es lo primero. Busca ayuda inmediata ahora.",
      resources: ["Llama al 112 o 911"],
      shouldEscalate: true,
    });
    (registerCrisisEvent as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "me quiero matar" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.crisis).toBe(true);
    expect(body.riskLevel).toBe("critical");
    expect(body.response).toContain("seguridad");
    expect(generateAIResponse).not.toHaveBeenCalled();
    expect(createGoalFromIntentMessage).not.toHaveBeenCalled();
    expect(activateUserCrisis).toHaveBeenCalledTimes(1);
    expect(registerCrisisEvent).toHaveBeenCalledTimes(1);
  });

  it("mantiene modo contención mientras crisisActive esté vigente", async () => {
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["hoy estoy regular"]);
    (detectUserState as jest.Mock).mockReturnValue("ansiedad");
    (detectRiskLevel as jest.Mock).mockReturnValue("low");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (getUserCrisisStatus as jest.Mock).mockResolvedValue({
      active: true,
      expiresAt: "2026-03-30T12:00:00.000Z",
      reason: "active",
    });
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_crisis_2",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (getCrisisResponse as jest.Mock).mockReturnValue({
      response: "Vamos a centrarnos en tu seguridad y apoyo humano ahora mismo.",
      resources: ["Llama al 112 o 911"],
      shouldEscalate: true,
    });
    (registerCrisisEvent as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hoy estoy regular" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.crisis).toBe(true);
    expect(body.crisisActive).toBe(true);
    expect(body.riskLevel).toBe("high");
    expect(body.detectedRiskLevel).toBe("low");
    expect(generateAIResponse).not.toHaveBeenCalled();
    expect(createGoalFromIntentMessage).not.toHaveBeenCalled();
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

  it("usa searchWeb cuando el mensaje necesita info externa", async () => {
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["busca noticias de OpenAI"]);
    (detectUserState as jest.Mock).mockReturnValue("duda");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (createGoalFromIntentMessage as jest.Mock).mockResolvedValue(null);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(null);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_search_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (needsExternalInfo as jest.Mock).mockReturnValue(true);
    (buildSearchQuery as jest.Mock).mockReturnValue("OpenAI latest news");
    (searchWeb as jest.Mock).mockResolvedValue([
      {
        title: "OpenAI",
        url: "https://example.com/openai",
        snippet: "Latest OpenAI news",
        source: "duckduckgo",
      },
    ]);
    (generateAIResponse as jest.Mock).mockResolvedValue({
      response: "He encontrado información reciente.",
      fallback: false,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Busca noticias recientes de OpenAI" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(searchWeb).toHaveBeenCalledWith("OpenAI latest news", 3);
    expect(body.searchUsed).toBe(true);
  });

  it("bloquea el chat cuando hay una acción pendiente y el mensaje no cierra la acción", async () => {
    const activeGoal = {
      id: "goal_1",
      title: "Terminar propuesta",
      status: "active",
      createdAt: new Date("2026-03-30T10:00:00.000Z"),
      updatedAt: new Date("2026-03-30T10:00:00.000Z"),
      completedCount: 0,
      totalCount: 1,
      progress: 0,
      actions: [
        {
          id: "action_1",
          description: "Enviar el borrador al cliente",
          completed: false,
          createdAt: new Date("2026-03-30T10:00:00.000Z"),
        },
      ],
    };

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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["Quiero hablar de otra cosa"]);
    (detectUserState as jest.Mock).mockReturnValue("neutral");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(activeGoal);
    (getFirstPendingAction as jest.Mock).mockReturnValue(activeGoal.actions[0]);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_lock_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Quiero hablar de otra cosa" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("action_required");
    expect(body.action).toEqual({
      id: "action_1",
      title: "Enviar el borrador al cliente",
    });
    expect(body.message).toBe("Tienes una acción pendiente antes de continuar.");
    expect(generateAIResponse).not.toHaveBeenCalled();
  });

  it("registra evitación explícita y mantiene el bloqueo", async () => {
    const activeGoal = {
      id: "goal_1",
      title: "Terminar propuesta",
      status: "active",
      createdAt: new Date("2026-03-30T10:00:00.000Z"),
      updatedAt: new Date("2026-03-30T10:00:00.000Z"),
      completedCount: 0,
      totalCount: 1,
      progress: 0,
      actions: [
        {
          id: "action_1",
          description: "Enviar el borrador al cliente",
          completed: false,
          createdAt: new Date("2026-03-30T10:00:00.000Z"),
        },
      ],
    };

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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["mañana"]);
    (detectUserState as jest.Mock).mockReturnValue("neutral");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(activeGoal);
    (getFirstPendingAction as jest.Mock).mockReturnValue(activeGoal.actions[0]);
    (detectActionPostponeIntent as jest.Mock).mockReturnValue(true);
    (registerAvoidanceEvent as jest.Mock).mockResolvedValue(2);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_lock_2",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "mañana" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(registerAvoidanceEvent).toHaveBeenCalledWith({
      userId: "usr_test_1",
      actionId: "action_1",
      type: "postpone",
    });
    expect(body.type).toBe("action_required");
    expect(body.message).toBe(
      "Has evitado esta decisión varias veces. ¿Vas a hacerla ahora o prefieres asumir que no es una prioridad?"
    );
    expect(generateAIResponse).not.toHaveBeenCalled();
  });

  it("no bloquea si el estado es ansiedad", async () => {
    const activeGoal = {
      id: "goal_1",
      title: "Terminar propuesta",
      status: "active",
      createdAt: new Date("2026-03-30T10:00:00.000Z"),
      updatedAt: new Date("2026-03-30T10:00:00.000Z"),
      completedCount: 0,
      totalCount: 1,
      progress: 0,
      actions: [
        {
          id: "action_1",
          description: "Enviar el borrador al cliente",
          completed: false,
          createdAt: new Date("2026-03-30T10:00:00.000Z"),
        },
      ],
    };

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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["no ahora"]);
    (detectUserState as jest.Mock).mockReturnValue("ansiedad");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(activeGoal);
    (getFirstPendingAction as jest.Mock).mockReturnValue(activeGoal.actions[0]);
    (detectActionPostponeIntent as jest.Mock).mockReturnValue(true);
    (registerAvoidanceEvent as jest.Mock).mockResolvedValue(2);
    (shouldBypassActionLock as jest.Mock).mockReturnValue(true);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_lock_3",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (generateAIResponse as jest.Mock).mockResolvedValue({
      response: "Vamos a bajar la exigencia y decidir un paso seguro.",
      fallback: false,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "no ahora" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBeUndefined();
    expect(generateAIResponse).toHaveBeenCalledTimes(1);
  });
});
