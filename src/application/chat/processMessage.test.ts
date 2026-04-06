/**
 * Tests for processMessage pipeline — focused on Phase 3 (Intercept) scenarios:
 * - Crisis mode → early return with crisis response
 * - Action lock → early return with action_required
 * - Transitional void → early return with TV response
 * - Normal flow → passes through to AI generation
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("@/lib/alerts", () => ({
  sendAvoidanceEscalationAlert: jest.fn(),
  sendCrisisEscalationAlert: jest.fn(),
}));

jest.mock("@/services/conversation", () => ({
  countMessagesForConversation: jest.fn().mockResolvedValue(1),
  ensureUserSession: jest.fn().mockResolvedValue(undefined),
  listMessagesForConversation: jest.fn().mockResolvedValue([]),
  listRecentUserMessagesForUser: jest.fn().mockResolvedValue([]),
  resolveConversationForUser: jest.fn().mockResolvedValue({ id: "conv_1", title: "Test" }),
  saveConversationMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/emotional-model", () => ({
  analyzeEmotionalProfile: jest.fn().mockReturnValue({
    primaryEmotion: "calma",
    dominantPattern: "evita_decidir",
    focusArea: "propósito",
    energyLevel: "medio",
    riskLevel: "low",
    progressTrend: "igual",
  }),
  updateEmotionalProfile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/goals", () => ({
  buildGoalCoachContext: jest.fn().mockReturnValue(null),
  countPendingActions: jest.fn().mockReturnValue(0),
  completeFirstPendingActionForUser: jest.fn().mockResolvedValue(null),
  createGoalFromIntentMessage: jest.fn().mockResolvedValue(null),
  detectActionCompletionIntent: jest.fn().mockReturnValue(false),
  detectAvoidance: jest.fn().mockReturnValue(false),
  detectActionPostponeIntent: jest.fn().mockReturnValue(false),
  detectActionRefusalIntent: jest.fn().mockReturnValue(false),
  getAvoidanceCountForAction: jest.fn().mockResolvedValue(0),
  getAvoidanceStreakForUser: jest.fn().mockResolvedValue(0),
  getFirstPendingAction: jest.fn().mockReturnValue(null),
  getActiveGoalForUser: jest.fn().mockResolvedValue(null),
  registerAvoidanceEvent: jest.fn().mockResolvedValue(1),
}));

jest.mock("@/services/state", () => ({
  activateUserCrisis: jest.fn().mockResolvedValue(new Date("2026-04-06T12:00:00Z")),
  buildConversationContext: jest.fn().mockReturnValue({ lastGoal: null, pendingActions: [], emotionalState: "neutral", summary: "" }),
  clearUserCrisis: jest.fn().mockResolvedValue(undefined),
  detectUserState: jest.fn().mockReturnValue("neutral"),
  getUserCrisisStatus: jest.fn().mockResolvedValue({ active: false, expiresAt: null }),
  shouldBypassActionLock: jest.fn().mockReturnValue(false),
  updateUserTransformationPhase: jest.fn().mockResolvedValue(undefined),
  updateUserState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/risk", () => ({
  detectRiskLevel: jest.fn().mockReturnValue("low"),
  getCrisisResponse: jest.fn().mockReturnValue({
    response: "Estoy contigo.",
    resources: [{ name: "112", url: "tel:112" }],
    shouldEscalate: true,
    legalFlag: true,
    disclaimer: "No sustituye terapia.",
    continueChat: false,
  }),
  registerCrisisEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/user", () => ({
  getUserSessionProfile: jest.fn().mockResolvedValue({
    isAnonymous: false, hasPlan: false, messageLimitPerDay: 10, messagesUsedToday: 0,
    plan: "free", planLabel: "Free", subscriptionStatus: "free",
  }),
}));

jest.mock("@/services/ai", () => ({
  generateAIResponse: jest.fn().mockResolvedValue({ response: "Respuesta IA test", fallback: false }),
  streamOpenRouterTokens: jest.fn(),
}));

jest.mock("@/services/impulse-ai", () => ({
  generateImpulseResponse: jest.fn().mockResolvedValue({ response: "Impulse test", fallback: false }),
}));

jest.mock("@/services/coach", () => ({
  appendCaptureEmailPrompt: jest.fn((msg) => msg),
  appendConversionPrompt: jest.fn((msg) => msg),
  appendSoftPaywallPrompt: jest.fn((msg) => msg),
  buildActionRequiredMessage: jest.fn().mockReturnValue("Tienes una acción pendiente."),
  buildCoachPrompt: jest.fn().mockReturnValue("System prompt test"),
  buildFallbackResponse: jest.fn().mockReturnValue("Fallback response"),
  finalizeResponse: jest.fn((msg) => msg),
}));

jest.mock("@/services/events", () => ({
  trackSafe: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/flows", () => ({
  hydrateDialogueState: jest.fn().mockResolvedValue({ currentIntent: "clarification", currentStep: 0, activeFlow: null }),
  persistDialogueState: jest.fn().mockResolvedValue(undefined),
  runFlow: jest.fn().mockReturnValue({ currentIntent: "clarification", currentStep: 0, activeFlow: null, instruction: null }),
}));

jest.mock("@/services/intent", () => ({
  detectIntent: jest.fn().mockReturnValue("clarification"),
}));

jest.mock("@/services/mentor-protocol", () => ({
  getMentorMode: jest.fn().mockReturnValue({ mode: "supportive", validate: true, confront: false, pushAction: false, stopConversation: false, reason: "default" }),
  shouldAskForEmail: jest.fn().mockReturnValue(false),
}));

jest.mock("@/services/onboarding", () => ({
  getConversationalOnboarding: jest.fn().mockReturnValue(null),
}));

jest.mock("@/services/transformation", () => ({
  inferTransformationPhase: jest.fn().mockReturnValue("exploración"),
  describeTransformationPhase: jest.fn().mockReturnValue("Fase de exploración"),
}));

jest.mock("@/services/impulse-challenges", () => ({
  upsertDailyImpulseLog: jest.fn().mockResolvedValue(undefined),
  listRecentImpulseLogs: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/services/impulse-diagnostic", () => ({
  getUserImpulseProfile: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/services/journey-coach-bridge", () => ({
  buildJourneyPromptBlock: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/services/search", () => ({
  buildSearchQuery: jest.fn().mockReturnValue(null),
  classifyExternalInfoNeed: jest.fn().mockReturnValue({ shouldUse: false }),
  needsExternalInfo: jest.fn().mockReturnValue(false),
  searchWeb: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/llm-logger", () => ({
  logLlmCall: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { processMessage, type ProcessMessageInput } from "./processMessage";
import { detectRiskLevel } from "@/services/risk";
import { detectUserState, getUserCrisisStatus } from "@/services/state";
import { getFirstPendingAction, getActiveGoalForUser, countPendingActions } from "@/services/goals";
import { buildActionRequiredMessage } from "@/services/coach";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_INPUT: ProcessMessageInput = {
  userId: "usr_test_1",
  message: "Hola, necesito ayuda",
  session: {
    isAnonymous: false,
    hasPlan: false,
    userPlan: "free",
    messageLimitPerDay: 10,
    messagesUsedToday: 0,
    planLabel: "Free",
    subscriptionStatus: "free",
  },
  jsonMode: true,
  conversationId: "conv_1",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("processMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  // ── Phase 3: Crisis intercept ────────────────────────────────────────────

  describe("Crisis intercept", () => {
    it("returns crisis response when risk level is high", async () => {
      (detectRiskLevel as jest.Mock).mockReturnValue("high");

      const result = await processMessage(BASE_INPUT);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.type).toBe("crisis");
        expect(result.data.crisis).toBe(true);
        expect(result.data.systemState).toBe("CRISIS");
        expect(result.data.riskLevel).toBe("high");
      }
    });

    it("returns crisis response when risk level is critical", async () => {
      (detectRiskLevel as jest.Mock).mockReturnValue("critical");

      const result = await processMessage(BASE_INPUT);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.type).toBe("crisis");
        expect(result.data.riskLevel).toBe("critical");
      }
    });

    it("returns crisis response when user has active crisis state", async () => {
      (getUserCrisisStatus as jest.Mock).mockResolvedValue({
        active: true,
        expiresAt: "2026-04-06T18:00:00Z",
      });

      const result = await processMessage(BASE_INPUT);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.type).toBe("crisis");
        expect(result.data.crisis).toBe(true);
      }
    });
  });

  // ── Phase 3: Action lock intercept ───────────────────────────────────────

  describe("Action lock intercept", () => {
    it("returns action_required when user has pending action and doesn't complete it", async () => {
      (detectRiskLevel as jest.Mock).mockReturnValue("low");
      (getUserCrisisStatus as jest.Mock).mockResolvedValue({ active: false, expiresAt: null });

      const mockGoal = {
        id: "goal_1",
        title: "Test goal",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        completedCount: 0,
        totalCount: 1,
        progress: 0,
        actions: [{ id: "act_1", description: "Hacer algo", completed: false, createdAt: new Date() }],
      };
      (getActiveGoalForUser as jest.Mock).mockResolvedValue(mockGoal);
      (getFirstPendingAction as jest.Mock).mockReturnValue(mockGoal.actions[0]);
      (countPendingActions as jest.Mock).mockReturnValue(1);

      const result = await processMessage(BASE_INPUT);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.type).toBe("action_required");
        expect(buildActionRequiredMessage).toHaveBeenCalled();
      }
    });
  });

  // ── Phase 3: Normal flow (no intercept) ──────────────────────────────────

  describe("Normal flow (no intercepts)", () => {
    it("returns AI response in JSON mode when no crisis/action lock", async () => {
      (detectRiskLevel as jest.Mock).mockReturnValue("low");
      (getUserCrisisStatus as jest.Mock).mockResolvedValue({ active: false, expiresAt: null });

      const result = await processMessage(BASE_INPUT);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.success).toBe(true);
        expect(result.data.response).toBeDefined();
        expect(result.data.state).toBeDefined();
        expect(result.data.conversationId).toBe("conv_1");
        // No intercept type — normal flow returns response without type field
        expect(result.data.crisis).toBeUndefined();
      }
    });
  });
});
