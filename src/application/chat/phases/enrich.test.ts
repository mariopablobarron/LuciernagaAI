/**
 * Unit tests for phases/enrich.ts — Phase 2 of the processMessage pipeline.
 *
 * Coverage focus: behavior that the processMessage golden masters
 * do NOT exercise (DB failure path, isolated EnrichResult shape).
 * Scenario coverage at the integration level lives in
 * processMessage.golden.test.ts.
 */

jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("@/lib/alerts", () => ({
  sendAvoidanceEscalationAlert: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/events", () => ({
  trackSafe: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/coach", () => ({
  buildActionRequiredMessage: jest.fn().mockReturnValue("Tienes una acción pendiente."),
}));

jest.mock("@/services/conversation", () => ({
  countMessagesForConversation: jest.fn().mockResolvedValue(1),
  ensureUserSession: jest.fn().mockResolvedValue(undefined),
  listMessagesForConversation: jest.fn().mockResolvedValue([]),
  listRecentUserMessagesForUser: jest.fn().mockResolvedValue([]),
  resolveConversationForUser: jest.fn().mockResolvedValue({ id: "conv_1", title: "Conversación de prueba" }),
  saveConversationMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/impulse-challenges", () => ({
  upsertDailyImpulseLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/goals", () => ({
  countPendingActions: jest.fn().mockReturnValue(0),
  completeFirstPendingActionForUser: jest.fn().mockResolvedValue(null),
  createGoalFromIntentMessage: jest.fn().mockResolvedValue(null),
  detectActionCompletionIntent: jest.fn().mockReturnValue(false),
  detectActionPostponeIntent: jest.fn().mockReturnValue(false),
  detectActionRefusalIntent: jest.fn().mockReturnValue(false),
  detectAvoidance: jest.fn().mockReturnValue(false),
  getFirstPendingAction: jest.fn().mockReturnValue(null),
  getActiveGoalForUser: jest.fn().mockResolvedValue(null),
  getAvoidanceCountForAction: jest.fn().mockResolvedValue(0),
  getAvoidanceStreakForUser: jest.fn().mockResolvedValue(0),
  registerAvoidanceEvent: jest.fn().mockResolvedValue(1),
}));

jest.mock("@/services/mentor-protocol", () => ({
  getMentorMode: jest.fn().mockReturnValue({
    mode: "supportive",
    validate: true,
    confront: false,
    pushAction: false,
    stopConversation: false,
    reason: "default",
  }),
  shouldAskForEmail: jest.fn().mockReturnValue(false),
}));

jest.mock("@/services/onboarding", () => ({
  getConversationalOnboarding: jest.fn().mockReturnValue(null),
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

jest.mock("@/services/state", () => ({
  activateUserCrisis: jest.fn().mockResolvedValue(new Date("2026-04-06T12:00:00Z")),
  clearUserCrisis: jest.fn().mockResolvedValue(undefined),
  getUserCrisisStatus: jest.fn().mockResolvedValue({ active: false, expiresAt: null }),
  shouldBypassActionLock: jest.fn().mockReturnValue(false),
  updateUserTransformationPhase: jest.fn().mockResolvedValue(undefined),
  updateUserState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/transformation", () => ({
  inferTransformationPhase: jest.fn().mockReturnValue("exploración"),
  describeTransformationPhase: jest.fn().mockReturnValue("Fase de exploración"),
}));

jest.mock("@/services/user", () => ({
  getUserSessionProfile: jest.fn().mockResolvedValue({
    isAnonymous: false,
    hasPlan: false,
    messageLimitPerDay: 10,
    messagesUsedToday: 0,
    plan: "free",
    planLabel: "Free",
    subscriptionStatus: "free",
  }),
}));

import { enrichContext, type EnrichInput } from "./enrich";
import { ensureUserSession } from "@/services/conversation";
import { getUserCrisisStatus } from "@/services/state";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_INPUT: EnrichInput = {
  userId: "usr_enrich_1",
  message: "Hola",
  conversationIdHint: "conv_1",
  state: "neutral",
  detectedIntent: "clarification",
  riskLevel: "low",
  tvSignals: { confusionScore: 0, identityShift: false, directionClarity: 1 },
  flowContext: {
    currentIntent: "clarification",
    currentStep: 0,
    activeFlow: null,
    instruction: null,
  },
  crisisMode: false,
  crisisSource: "none",
  crisisActiveUntil: null,
};

describe("enrichContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a complete EnrichResult shape on the happy path", async () => {
    const result = await enrichContext(BASE_INPUT);

    expect(result.persistenceAvailable).toBe(true);
    expect(result.conversationId).toBe("conv_1");
    expect(result.emotionalProfile).toEqual(
      expect.objectContaining({ primaryEmotion: "calma" }),
    );
    expect(result.crisisMode).toBe(false);
    expect(result.crisisSource).toBe("none");
    expect(result.activeGoal).toBeNull();
    expect(result.domainState).toBeDefined();
    expect(result.domainDecision).toBeDefined();
    expect(result.transformationPhase).toBe("exploración");
    expect(result.mentorMode.mode).toBe("supportive");
    expect(result.actionLockPayload).toBeNull();
  });

  it("degrades gracefully when the DB layer throws", async () => {
    (ensureUserSession as jest.Mock).mockRejectedValueOnce(new Error("db down"));

    const result = await enrichContext(BASE_INPUT);

    expect(result.persistenceAvailable).toBe(false);
    // Emotional profile fallback must still produce a usable object.
    expect(result.emotionalProfile).toBeDefined();
    // Defaults remain intact so downstream phases can proceed.
    expect(result.mentorMode.reason).toBe("pending_db");
    expect(result.activeGoal).toBeNull();
    expect(result.actionLockPayload).toBeNull();
  });

  it("marks crisisSource=detected when the detected risk level is high", async () => {
    const result = await enrichContext({ ...BASE_INPUT, riskLevel: "high" });

    expect(result.crisisMode).toBe(true);
    expect(result.crisisSource).toBe("detected");
    expect(result.crisisActiveUntil).toBe("2026-04-06T12:00:00.000Z");
  });

  it("marks crisisSource=active_state when the BD reports an active crisis", async () => {
    (getUserCrisisStatus as jest.Mock).mockResolvedValueOnce({
      active: true,
      expiresAt: "2026-04-07T00:00:00Z",
    });

    const result = await enrichContext(BASE_INPUT);

    expect(result.crisisMode).toBe(true);
    expect(result.crisisSource).toBe("active_state");
    expect(result.crisisActiveUntil).toBe("2026-04-07T00:00:00Z");
  });

  it("skips goal/mentor work while in crisis (short-circuit)", async () => {
    const result = await enrichContext({ ...BASE_INPUT, riskLevel: "critical" });

    // Inside the try block, `if (!crisisMode)` is skipped once crisis activates,
    // so activeGoal stays null and transformation remains at the default.
    expect(result.crisisMode).toBe(true);
    expect(result.activeGoal).toBeNull();
    expect(result.transformationPhase).toBe("bloqueo");
  });
});
