jest.mock("@/lib/auth", () => {
  class MockInvalidSessionTokenError extends Error {
    constructor() {
      super("Invalid or expired session token");
      this.name = "InvalidSessionTokenError";
    }
  }

  const resolveIdentityMock = jest.fn();
  return {
    InvalidSessionTokenError: MockInvalidSessionTokenError,
    resolveIdentity: resolveIdentityMock,
    // bootstrapSessionIdentity delegates to resolveIdentity in the real code
    bootstrapSessionIdentity: jest.fn((...args: unknown[]) => resolveIdentityMock(...args)),
    attachSessionCookie: jest.fn(),
    clearSessionCookie: jest.fn(),
  };
});

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/alerts", () => ({
  sendAvoidanceEscalationAlert: jest.fn(),
  sendCrisisEscalationAlert: jest.fn(),
}));

jest.mock("@/services/conversation", () => ({
  countMessagesForConversation: jest.fn(),
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
  classifyExternalInfoNeed: jest.fn(),
  needsExternalInfo: jest.fn(),
  searchWeb: jest.fn(),
}));

jest.mock("@/services/goals", () => ({
  buildGoalCoachContext: jest.fn(),
  countPendingActions: jest.fn(),
  completeFirstPendingActionForUser: jest.fn(),
  createGoalFromIntentMessage: jest.fn(),
  detectActionCompletionIntent: jest.fn(),
  detectAvoidance: jest.fn(),
  detectActionPostponeIntent: jest.fn(),
  detectActionRefusalIntent: jest.fn(),
  getAvoidanceCountForAction: jest.fn(),
  getAvoidanceStreakForUser: jest.fn(),
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
  updateUserTransformationPhase: jest.fn(),
  updateUserState: jest.fn(),
}));

jest.mock("@/services/user", () => ({
  getUserSessionProfile: jest.fn(),
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
import { InvalidSessionTokenError, resolveIdentity, bootstrapSessionIdentity, clearSessionCookie } from "@/lib/auth";
import { sendAvoidanceEscalationAlert, sendCrisisEscalationAlert } from "@/lib/alerts";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  countMessagesForConversation,
  ensureUserSession,
  listRecentUserMessagesForUser,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import {
  buildGoalCoachContext,
  countPendingActions,
  completeFirstPendingActionForUser,
  createGoalFromIntentMessage,
  detectActionCompletionIntent,
  detectAvoidance,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  getAvoidanceCountForAction,
  getAvoidanceStreakForUser,
  getFirstPendingAction,
  getActiveGoalForUser,
  registerAvoidanceEvent,
} from "@/services/goals";
import {
  buildSearchQuery,
  classifyExternalInfoNeed,
  needsExternalInfo,
  searchWeb,
} from "@/services/search";
import {
  activateUserCrisis,
  buildConversationContext,
  clearUserCrisis,
  detectUserState,
  getUserCrisisStatus,
  shouldBypassActionLock,
  updateUserTransformationPhase,
  updateUserState,
} from "@/services/state";
import { getUserSessionProfile } from "@/services/user";
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
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({
      shouldUse: false,
      usage: "none",
    });
    (needsExternalInfo as jest.Mock).mockReturnValue(false);
    (searchWeb as jest.Mock).mockResolvedValue([]);
    (buildGoalCoachContext as jest.Mock).mockReturnValue(null);
    (countPendingActions as jest.Mock).mockImplementation(
      (goal) =>
        goal?.actions?.filter((action: { completed: boolean }) => !action.completed).length ?? 0
    );
    (completeFirstPendingActionForUser as jest.Mock).mockResolvedValue(null);
    (detectActionCompletionIntent as jest.Mock).mockReturnValue(false);
    (detectAvoidance as jest.Mock).mockReturnValue(false);
    (detectActionPostponeIntent as jest.Mock).mockReturnValue(false);
    (detectActionRefusalIntent as jest.Mock).mockReturnValue(false);
    (getAvoidanceCountForAction as jest.Mock).mockResolvedValue(0);
    (getAvoidanceStreakForUser as jest.Mock).mockResolvedValue(0);
    (getFirstPendingAction as jest.Mock).mockImplementation(
      (goal) => goal?.actions?.find((action: { completed: boolean }) => !action.completed) ?? null
    );
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
      legalFlag: false,
      disclaimer: "Tres Mil Millones de Latidos no sustituye terapia.",
      continueChat: true,
    });
    (getUserCrisisStatus as jest.Mock).mockResolvedValue({
      active: false,
      expiresAt: null,
      reason: "none",
    });
    (registerAvoidanceEvent as jest.Mock).mockResolvedValue(1);
    (shouldBypassActionLock as jest.Mock).mockReturnValue(false);
    (countMessagesForConversation as jest.Mock).mockResolvedValue(1);
    (updateUserTransformationPhase as jest.Mock).mockResolvedValue(undefined);
    (getUserSessionProfile as jest.Mock).mockResolvedValue({
      id: "usr_test_1",
      email: "anon@session.luciernaga.local",
      name: null,
      role: "user",
      plan: "free",
      planLabel: "Free",
      subscriptionStatus: "free",
      hasPlan: false,
      isAnonymous: true,
      messagesUsedToday: 0,
      messagesRemainingToday: 10,
      messageLimitPerDay: 10,
    });
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
    expect(body.response).toContain("Respuesta de prueba");
    expect(body.response).toContain("No busques entenderlo todo ahora");
    expect(body.response).toContain("¿Qué estás evitando ahora mismo?");
    expect(body.emotionalProfile.primaryEmotion).toBe("calma");
    expect(body.captureEmail).toBe(false);
    expect(body.flow).toEqual({
      currentIntent: "greeting",
      currentStep: 0,
      activeFlow: null,
      instruction: null,
    });
    expect(updateEmotionalProfile).toHaveBeenCalledTimes(1);
    expect(generateAIResponse).toHaveBeenCalledWith(
      "Hola mentor",
      "neutral",
      expect.any(Object),
      expect.objectContaining({
        onboarding: expect.objectContaining({
          active: true,
          stage: "opening",
          starterQuestion: "¿Qué llevas semanas evitando hacer?",
        }),
      }),
      expect.any(Array),
      expect.any(Object)
    );
  });

  it("bloquea el chat cuando el plan free alcanza el limite diario", async () => {
    (resolveIdentity as jest.Mock).mockReturnValue({
      userId: "usr_test_limit",
      source: "session",
      sessionToken: "token",
      shouldSetCookie: false,
    });
    (getUserSessionProfile as jest.Mock).mockResolvedValue({
      id: "usr_test_limit",
      email: "anon@session.luciernaga.local",
      name: null,
      role: "user",
      plan: "free",
      planLabel: "Free",
      subscriptionStatus: "free",
      hasPlan: false,
      isAnonymous: true,
      messagesUsedToday: 10,
      messagesRemainingToday: 0,
      messageLimitPerDay: 10,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Quiero seguir trabajando" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.code).toBe("PLAN_LIMIT_REACHED");
    expect(body.response).toContain("No es falta de claridad.");
    expect(body.response).toContain("¿Quieres sostener este avance con continuidad real?");
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(saveConversationMessage).not.toHaveBeenCalled();
  });

  it("marca conversionTrigger cuando detecta claridad", async () => {
    (resolveIdentity as jest.Mock).mockReturnValue({
      userId: "usr_test_conversion",
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["ya lo veo claro"]);
    (detectUserState as jest.Mock).mockReturnValue("claridad");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (createGoalFromIntentMessage as jest.Mock).mockResolvedValue(null);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(null);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_conversion_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (generateAIResponse as jest.Mock).mockResolvedValue({
      response: "Ahora toca convertirlo en avance visible.",
      fallback: false,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Ya lo veo claro" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.conversionTrigger).toBe(true);
    expect(body.conversionType).toBe("progress");
    expect(body.captureEmail).toBe(true);
    expect(body.response).toContain("Esto que acabas de definir es importante.");
    expect(body.response).toContain(
      "¿Quieres guardar tu progreso y continuar otro día? Déjame tu email."
    );
    expect(generateAIResponse).toHaveBeenCalledWith(
      "Ya lo veo claro",
      "claridad",
      expect.any(Object),
      expect.objectContaining({
        access: expect.objectContaining({
          userPlan: "free",
          remainingMessages: 9,
          hasActiveGoal: false,
          conversionTrigger: true,
        }),
      }),
      expect.any(Array),
      expect.any(Object)
    );
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
      legalFlag: true,
      disclaimer: "Tres Mil Millones de Latidos no sustituye terapia.",
      continueChat: false,
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
    expect(body.type).toBe("crisis");
    expect(body.continueChat).toBe(false);
    expect(body.riskLevel).toBe("critical");
    expect(body.response).toContain("seguridad");
    expect(generateAIResponse).not.toHaveBeenCalled();
    expect(createGoalFromIntentMessage).not.toHaveBeenCalled();
    expect(activateUserCrisis).toHaveBeenCalledTimes(1);
    expect(registerCrisisEvent).toHaveBeenCalledTimes(1);
    expect(sendCrisisEscalationAlert).toHaveBeenCalledWith({
      userId: "usr_test_1",
      level: "critical",
      message: "me quiero matar",
    });
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
      legalFlag: true,
      disclaimer: "Tres Mil Millones de Latidos no sustituye terapia.",
      continueChat: false,
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
    expect(body.type).toBe("crisis");
    expect(body.continueChat).toBe(false);
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

  it("usa searchWeb solo cuando el mensaje pide opciones reales", async () => {
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue([
      "busca opciones reales de terapia online en Madrid",
    ]);
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
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({
      shouldUse: true,
      usage: "practical_decision",
    });
    (buildSearchQuery as jest.Mock).mockReturnValue("terapia online Madrid");
    (searchWeb as jest.Mock).mockResolvedValue([
      {
        title: "Terapia online Madrid",
        url: "https://example.com/therapy",
        snippet: "Opciones verificadas de terapia online",
        source: "duckduckgo",
      },
    ]);
    (generateAIResponse as jest.Mock).mockResolvedValue({
      response: "He encontrado información reciente.",
      fallback: false,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Busca opciones reales de terapia online en Madrid" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(searchWeb).toHaveBeenCalledWith("terapia online Madrid", 3);
    expect(body.searchUsed).toBe(true);
  });

  it("genera un objetivo con accion para una conversacion relevante", async () => {
    const generatedGoal = {
      id: "goal_focus_1",
      title: "Decidir si dejar mi trabajo",
      status: "active",
      createdAt: new Date("2026-03-30T10:00:00.000Z"),
      updatedAt: new Date("2026-03-30T10:00:00.000Z"),
      completedCount: 0,
      totalCount: 3,
      progress: 0,
      actions: [
        {
          id: "action_focus_1",
          description: "Definir hoy el criterio principal para tomar la decision",
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["No sé si dejar mi trabajo"]);
    (detectUserState as jest.Mock).mockReturnValue("duda");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(null);
    (createGoalFromIntentMessage as jest.Mock).mockResolvedValue({
      goal: generatedGoal,
      created: true,
    });
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_focus_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);
    (generateAIResponse as jest.Mock).mockResolvedValue({
      response: "Vamos a centrar esto en un solo criterio y convertirlo en decision hoy.",
      fallback: false,
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "No sé si dejar mi trabajo" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createGoalFromIntentMessage).toHaveBeenCalledWith({
      userId: "usr_test_1",
      message: "No sé si dejar mi trabajo",
    });
    expect(body.goal.title).toBe("Decidir si dejar mi trabajo");
    expect(body.action).toBe("Definir hoy el criterio principal para tomar la decision");
    expect(generateAIResponse).toHaveBeenCalledTimes(1);
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
    expect(body.message).toBe(
      'Tu objetivo activo es "Terminar propuesta". Antes de seguir, necesito una respuesta directa: ¿ya completaste "Enviar el borrador al cliente"? Responde sí o no.\n\n¿Quieres guardar tu progreso y continuar otro día? Déjame tu email.'
    );
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
    expect(sendAvoidanceEscalationAlert).toHaveBeenCalledWith({
      userId: "usr_test_1",
      type: "postpone",
      count: 2,
      actionTitle: "Enviar el borrador al cliente",
      goalTitle: "Terminar propuesta",
    });
    expect(body.type).toBe("action_required");
    expect(body.message).toBe(
      'Tu objetivo activo es "Terminar propuesta". Estás acumulando decisiones sin cerrar. No te voy a ayudar a abrir otro frente hasta resolver este. ¿Ya completaste "Enviar el borrador al cliente"? Responde sí o no, y si no, dime cuándo la harás hoy.\n\n¿Quieres guardar tu progreso y continuar otro día? Déjame tu email.'
    );
    expect(generateAIResponse).not.toHaveBeenCalled();
  });

  it("detecta evasión genérica y activa confrontación directa", async () => {
    const activeGoal = {
      id: "goal_avoidance_1",
      title: "Cerrar propuesta",
      status: "active",
      createdAt: new Date("2026-03-30T10:00:00.000Z"),
      updatedAt: new Date("2026-03-30T10:00:00.000Z"),
      completedCount: 0,
      totalCount: 1,
      progress: 0,
      actions: [
        {
          id: "action_avoidance_1",
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
    (listRecentUserMessagesForUser as jest.Mock).mockResolvedValue(["cambiemos de tema"]);
    (detectUserState as jest.Mock).mockReturnValue("neutral");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(activeGoal);
    (getFirstPendingAction as jest.Mock).mockReturnValue(activeGoal.actions[0]);
    (detectAvoidance as jest.Mock).mockReturnValue(true);
    (registerAvoidanceEvent as jest.Mock).mockResolvedValue(2);
    (resolveConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_avoidance_1",
      title: "Nueva conversación",
    });
    (saveConversationMessage as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "cambiemos de tema" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(registerAvoidanceEvent).toHaveBeenCalledWith({
      userId: "usr_test_1",
      actionId: "action_avoidance_1",
      type: "avoidance",
    });
    expect(sendAvoidanceEscalationAlert).toHaveBeenCalledWith({
      userId: "usr_test_1",
      type: "avoidance",
      count: 2,
      actionTitle: "Enviar el borrador al cliente",
      goalTitle: "Cerrar propuesta",
    });
    expect(body.type).toBe("action_required");
    expect(body.message).toContain("¿Ya completaste");
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
