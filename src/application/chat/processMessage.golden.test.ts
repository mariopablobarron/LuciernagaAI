/**
 * Golden master tests for processMessage pipeline.
 *
 * Goal: freeze the shape of processMessage's output for 10 representative
 * scenarios so that the upcoming Phase 2 (ENRICH) and Phase 5 (RESPOND)
 * extractions can be verified against a stable baseline.
 *
 * Rules for this suite:
 * - Services are stubbed at the module boundary (cheap, deterministic).
 * - All dates/IDs that end up in the snapshot must come from mocks.
 * - If a snapshot diff appears during a refactor, investigate before
 *   running `--updateSnapshot`. A drift without a justified reason = regression.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("@/lib/alerts", () => ({
  sendAvoidanceEscalationAlert: jest.fn().mockResolvedValue(undefined),
  sendCrisisEscalationAlert: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/n8n", () => ({
  dispatchN8nEvent: jest.fn(),
}));

jest.mock("@/lib/llm-logger", () => ({
  logLlmCall: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn().mockReturnValue({
    userState: {
      upsert: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));

jest.mock("@/services/conversation", () => ({
  countMessagesForConversation: jest.fn().mockResolvedValue(1),
  ensureUserSession: jest.fn().mockResolvedValue(undefined),
  listMessagesForConversation: jest.fn().mockResolvedValue([]),
  listRecentUserMessagesForUser: jest.fn().mockResolvedValue([]),
  resolveConversationForUser: jest.fn().mockResolvedValue({ id: "conv_1", title: "Conversación de prueba" }),
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
  buildConversationContext: jest.fn().mockReturnValue({
    lastGoal: null,
    pendingActions: [],
    emotionalState: "neutral",
    summary: "",
  }),
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
    response: "Estoy contigo. Si estás en peligro inmediato, llama al 112.",
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
    isAnonymous: false,
    hasPlan: false,
    messageLimitPerDay: 10,
    messagesUsedToday: 0,
    plan: "free",
    planLabel: "Free",
    subscriptionStatus: "free",
  }),
}));

jest.mock("@/services/ai", () => ({
  generateAIResponse: jest.fn().mockResolvedValue({
    response: "Respuesta IA de prueba.",
    fallback: false,
  }),
  streamOpenRouterTokens: jest.fn(),
}));

jest.mock("@/services/impulse-ai", () => ({
  generateImpulseResponse: jest.fn().mockResolvedValue({
    response: "Respuesta impulso de prueba.",
    fallback: false,
  }),
}));

jest.mock("@/services/coach", () => ({
  appendCaptureEmailPrompt: jest.fn((msg) => msg),
  appendConversionPrompt: jest.fn((msg) => msg),
  appendSoftPaywallPrompt: jest.fn((msg, active) => (active ? `${msg} [paywall]` : msg)),
  buildActionRequiredMessage: jest.fn().mockReturnValue("Antes de seguir: hay una acción pendiente."),
  buildCoachPrompt: jest.fn().mockReturnValue("System prompt test"),
  buildFallbackResponse: jest.fn().mockReturnValue("Fallback response"),
  finalizeResponse: jest.fn((msg) => msg),
}));

jest.mock("@/services/events", () => ({
  trackSafe: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/flows", () => ({
  hydrateDialogueState: jest.fn().mockResolvedValue({
    currentIntent: "clarification",
    currentStep: 0,
    activeFlow: null,
  }),
  persistDialogueState: jest.fn().mockResolvedValue(undefined),
  runFlow: jest.fn().mockReturnValue({
    currentIntent: "clarification",
    currentStep: 0,
    activeFlow: null,
    instruction: null,
  }),
}));

jest.mock("@/services/intent", () => ({
  detectIntent: jest.fn().mockReturnValue("clarification"),
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

jest.mock("@/services/project-coach-bridge", () => ({
  buildProjectPromptBlock: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/services/search", () => ({
  buildSearchQuery: jest.fn().mockReturnValue(null),
  classifyExternalInfoNeed: jest.fn().mockReturnValue({ shouldUse: false }),
  needsExternalInfo: jest.fn().mockReturnValue(false),
  searchWeb: jest.fn().mockResolvedValue([]),
}));

// Domain engine modules are NOT mocked — they are pure functions and we want
// real decision/state output captured in the snapshots.

// ─── Imports ──────────────────────────────────────────────────────────────────

import { processMessage, type ProcessMessageInput } from "./processMessage";
import { detectRiskLevel } from "@/services/risk";
import { detectUserState, getUserCrisisStatus } from "@/services/state";
import {
  getFirstPendingAction,
  getActiveGoalForUser,
  countPendingActions,
  createGoalFromIntentMessage,
  detectAvoidance,
  detectActionCompletionIntent,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  completeFirstPendingActionForUser,
  getAvoidanceCountForAction,
  getAvoidanceStreakForUser,
  registerAvoidanceEvent,
} from "@/services/goals";
import { sendAvoidanceEscalationAlert } from "@/lib/alerts";
import { analyzeEmotionalProfile } from "@/services/emotional-model";
import { getUserSessionProfile } from "@/services/user";
import { shouldAskForEmail } from "@/services/mentor-protocol";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_INPUT: ProcessMessageInput = {
  userId: "usr_golden_1",
  message: "Hola, necesito ayuda para avanzar.",
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

type GoalAction = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
};

type GoalFixture = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  completedCount: number;
  totalCount: number;
  progress: number;
  actions: GoalAction[];
};

function makeGoal(overrides: Partial<GoalFixture> = {}): GoalFixture {
  const base: GoalFixture = {
    id: "goal_1",
    title: "Clarificar propósito",
    status: "active",
    createdAt: new Date("2026-04-01T08:00:00Z"),
    updatedAt: new Date("2026-04-05T08:00:00Z"),
    completedCount: 0,
    totalCount: 1,
    progress: 0,
    actions: [
      {
        id: "act_1",
        description: "Escribir 3 valores que guían tus decisiones.",
        completed: false,
        createdAt: new Date("2026-04-01T08:00:00Z"),
      },
    ],
  };
  return { ...base, ...overrides };
}

function resetMocksToDefault() {
  (detectRiskLevel as jest.Mock).mockReturnValue("low");
  (detectUserState as jest.Mock).mockReturnValue("neutral");
  (getUserCrisisStatus as jest.Mock).mockResolvedValue({ active: false, expiresAt: null });
  (getActiveGoalForUser as jest.Mock).mockResolvedValue(null);
  (getFirstPendingAction as jest.Mock).mockReturnValue(null);
  (countPendingActions as jest.Mock).mockReturnValue(0);
  (createGoalFromIntentMessage as jest.Mock).mockResolvedValue(null);
  (detectAvoidance as jest.Mock).mockReturnValue(false);
  (detectActionCompletionIntent as jest.Mock).mockReturnValue(false);
  (detectActionPostponeIntent as jest.Mock).mockReturnValue(false);
  (detectActionRefusalIntent as jest.Mock).mockReturnValue(false);
  (completeFirstPendingActionForUser as jest.Mock).mockResolvedValue(null);
  (getAvoidanceCountForAction as jest.Mock).mockResolvedValue(0);
  (getAvoidanceStreakForUser as jest.Mock).mockResolvedValue(0);
  (registerAvoidanceEvent as jest.Mock).mockResolvedValue(1);
  (analyzeEmotionalProfile as jest.Mock).mockReturnValue({
    primaryEmotion: "calma",
    dominantPattern: "evita_decidir",
    focusArea: "propósito",
    energyLevel: "medio",
    riskLevel: "low",
    progressTrend: "igual",
  });
  (getUserSessionProfile as jest.Mock).mockResolvedValue({
    isAnonymous: false,
    hasPlan: false,
    messageLimitPerDay: 10,
    messagesUsedToday: 0,
    plan: "free",
    planLabel: "Free",
    subscriptionStatus: "free",
  });
  (shouldAskForEmail as jest.Mock).mockReturnValue(false);
}

type Scenario = {
  name: string;
  input?: Partial<ProcessMessageInput>;
  setup: () => void;
};

const SCENARIOS: Scenario[] = [
  {
    name: "01 - mensaje neutral, sin goal, sin crisis → flujo normal IA",
    setup: () => {
      // Defaults are enough.
    },
  },
  {
    name: "02 - riskLevel high → crisis intercept (detected)",
    setup: () => {
      (detectRiskLevel as jest.Mock).mockReturnValue("high");
    },
  },
  {
    name: "03 - crisis activa en BD → crisis intercept (active_state)",
    setup: () => {
      (getUserCrisisStatus as jest.Mock).mockResolvedValue({
        active: true,
        expiresAt: "2026-04-06T18:00:00Z",
      });
    },
  },
  {
    name: "04 - goal con acción pendiente, usuario evade → action_required",
    setup: () => {
      const goal = makeGoal();
      (getActiveGoalForUser as jest.Mock).mockResolvedValue(goal);
      (getFirstPendingAction as jest.Mock).mockReturnValue(goal.actions[0]);
      (countPendingActions as jest.Mock).mockReturnValue(1);
    },
  },
  {
    name: "05 - goal con acción pendiente, usuario la completa → feedback + flujo normal",
    setup: () => {
      const goalBefore = makeGoal();
      const goalAfter = makeGoal({
        completedCount: 1,
        progress: 1,
        actions: [
          {
            id: "act_1",
            description: "Escribir 3 valores que guían tus decisiones.",
            completed: true,
            createdAt: new Date("2026-04-01T08:00:00Z"),
          },
        ],
      });
      (getActiveGoalForUser as jest.Mock).mockResolvedValue(goalBefore);
      (getFirstPendingAction as jest.Mock)
        .mockReturnValueOnce(goalBefore.actions[0])
        .mockReturnValue(null);
      (countPendingActions as jest.Mock).mockReturnValue(0);
      (detectActionCompletionIntent as jest.Mock).mockReturnValue(true);
      (completeFirstPendingActionForUser as jest.Mock).mockResolvedValue(goalAfter);
    },
  },
  {
    name: "06 - avoidance streak ≥3 → registro + escalación + action_required",
    setup: () => {
      const goal = makeGoal();
      (getActiveGoalForUser as jest.Mock).mockResolvedValue(goal);
      (getFirstPendingAction as jest.Mock).mockReturnValue(goal.actions[0]);
      (countPendingActions as jest.Mock).mockReturnValue(1);
      (detectAvoidance as jest.Mock).mockReturnValue(true);
      (getAvoidanceCountForAction as jest.Mock).mockResolvedValue(3);
      (getAvoidanceStreakForUser as jest.Mock).mockResolvedValue(3);
      (registerAvoidanceEvent as jest.Mock).mockResolvedValue(4);
    },
  },
  {
    name: "07 - intent de crear goal → createGoalFromIntent + flujo normal",
    setup: () => {
      const createdGoal = makeGoal({ id: "goal_new", title: "Objetivo creado desde intent" });
      (getActiveGoalForUser as jest.Mock).mockResolvedValue(null);
      (createGoalFromIntentMessage as jest.Mock).mockResolvedValue({
        created: true,
        goal: createdGoal,
      });
      (countPendingActions as jest.Mock).mockReturnValue(1);
      (getFirstPendingAction as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValue(createdGoal.actions[0]);
    },
  },
  {
    name: "08 - señales de transitional void → TV intercept",
    input: {
      message: "Ya no sé quién soy. Nada de lo que era me representa. No sé qué hacer.",
    },
    setup: () => {
      // analyze.ts computes tvSignals from the message text itself; a vague
      // identity-loss message will push confusionScore/identityShift high
      // and drive domainState → TRANSITIONAL_VOID via buildUserState.
    },
  },
  {
    name: "09 - último mensaje del día (soft paywall activo)",
    input: {
      session: {
        isAnonymous: false,
        hasPlan: false,
        userPlan: "free",
        messageLimitPerDay: 10,
        messagesUsedToday: 9,
        planLabel: "Free",
        subscriptionStatus: "free",
      },
    },
    setup: () => {
      const goal = makeGoal();
      (getActiveGoalForUser as jest.Mock).mockResolvedValue(goal);
      (getFirstPendingAction as jest.Mock).mockReturnValue(null);
      (countPendingActions as jest.Mock).mockReturnValue(0);
    },
  },
  {
    name: "10 - modo stream (jsonMode=false) → meta payload estable",
    input: { jsonMode: false },
    setup: () => {
      // Defaults, but output is a stream — we snapshot the meta only.
    },
  },
];

// ─── Snapshot capture helpers ─────────────────────────────────────────────────

function captureForSnapshot(
  result: Awaited<ReturnType<typeof processMessage>>,
): Record<string, unknown> {
  if ("data" in result) {
    return { kind: "data", data: result.data };
  }
  return { kind: "stream", meta: result.meta };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("processMessage — golden masters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocksToDefault();
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  for (const scenario of SCENARIOS) {
    it(scenario.name, async () => {
      scenario.setup();

      const result = await processMessage({ ...BASE_INPUT, ...(scenario.input ?? {}) });
      const snapshot = captureForSnapshot(result);

      expect(snapshot).toMatchSnapshot();
    });
  }

  // Soft assertions that the scenarios actually hit what we think they hit.
  // If these break, the golden master is testing the wrong thing.

  it("scenario 06 actually calls sendAvoidanceEscalationAlert", async () => {
    const goal = makeGoal();
    (getActiveGoalForUser as jest.Mock).mockResolvedValue(goal);
    (getFirstPendingAction as jest.Mock).mockReturnValue(goal.actions[0]);
    (countPendingActions as jest.Mock).mockReturnValue(1);
    (detectAvoidance as jest.Mock).mockReturnValue(true);
    (getAvoidanceCountForAction as jest.Mock).mockResolvedValue(3);
    (registerAvoidanceEvent as jest.Mock).mockResolvedValue(4);

    await processMessage(BASE_INPUT);

    expect(sendAvoidanceEscalationAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "avoidance", count: 4 }),
    );
  });

  it("scenario 07 actually calls createGoalFromIntentMessage and surfaces the new goal", async () => {
    const createdGoal = makeGoal({ id: "goal_new", title: "Objetivo creado desde intent" });
    (createGoalFromIntentMessage as jest.Mock).mockResolvedValue({
      created: true,
      goal: createdGoal,
    });

    const result = await processMessage(BASE_INPUT);

    expect(createGoalFromIntentMessage).toHaveBeenCalled();
    if ("data" in result) {
      expect(result.data.goal).toMatchObject({ id: "goal_new" });
    }
  });
});
