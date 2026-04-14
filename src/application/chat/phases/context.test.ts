/**
 * Tests for phases/context.ts — Phase 4 of the processMessage pipeline.
 *
 * buildContext assembles coachContext from many services. Each dependency
 * is mocked; tests verify composition and error handling.
 */

jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("@/services/state", () => ({
  buildConversationContext: jest.fn().mockReturnValue({
    lastGoal: null,
    pendingActions: [],
    emotionalState: "neutral",
    summary: "",
  }),
}));

jest.mock("@/services/goals", () => ({
  buildGoalCoachContext: jest.fn().mockReturnValue(null),
  getFirstPendingAction: jest.fn().mockReturnValue(null),
}));

jest.mock("@/services/impulse-diagnostic", () => ({
  getUserImpulseProfile: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/services/impulse-challenges", () => ({
  listRecentImpulseLogs: jest.fn().mockResolvedValue([]),
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

import { buildContext, type ContextInput } from "./context";
import { buildGoalCoachContext, getFirstPendingAction } from "@/services/goals";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import { listRecentImpulseLogs } from "@/services/impulse-challenges";
import { buildJourneyPromptBlock } from "@/services/journey-coach-bridge";
import {
  buildSearchQuery,
  classifyExternalInfoNeed,
  needsExternalInfo,
  searchWeb,
} from "@/services/search";
import { logError } from "@/lib/logger";

// ─── Base input ───────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<ContextInput> = {}): ContextInput {
  return {
    userId: "usr_test",
    message: "Hola, ¿qué hago hoy?",
    conversationId: "conv_1",
    state: "neutral",
    emotionalProfile: {
      primaryEmotion: "calma",
      dominantPattern: "evita_decidir",
      focusArea: "propósito",
      energyLevel: "medio",
      riskLevel: "low",
      progressTrend: "igual",
    } as ContextInput["emotionalProfile"],
    activeGoal: null,
    flowContext: {
      currentIntent: "clarification",
      currentStep: 0,
      activeFlow: null,
      instruction: null,
    },
    mentorMode: {
      mode: "supportive",
      validate: true,
      confront: false,
      pushAction: false,
      stopConversation: false,
      reason: "default",
    } as ContextInput["mentorMode"],
    transformationPhase: "exploración" as ContextInput["transformationPhase"],
    transformationSummary: "Fase de exploración",
    onboardingContext: null,
    goalAvoidanceCount: 0,
    avoidanceDetectedThisTurn: false,
    conversionTrigger: false,
    session: { userPlan: "free", remainingMessages: 10, hasActiveGoal: false },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Baseline composition ────────────────────────────────────────────────────

describe("buildContext — baseline", () => {
  it("returns a coachContext with all required top-level keys", async () => {
    const result = await buildContext(makeInput());
    expect(result.coachContext).toHaveProperty("goal");
    expect(result.coachContext).toHaveProperty("continuity");
    expect(result.coachContext).toHaveProperty("flow");
    expect(result.coachContext).toHaveProperty("mentor");
    expect(result.coachContext).toHaveProperty("transformation");
    expect(result.coachContext).toHaveProperty("legal");
    expect(result.coachContext).toHaveProperty("onboarding");
    expect(result.coachContext).toHaveProperty("journeyPrompt");
    expect(result.coachContext).toHaveProperty("projectPrompt");
    expect(result.coachContext).toHaveProperty("access");
    expect(result.coachContext).toHaveProperty("web");
  });

  it("returns empty search results when no external info is needed", async () => {
    const result = await buildContext(makeInput());
    expect(result.searchResults).toEqual([]);
    expect(result.searchQuery).toBeNull();
    expect(result.coachContext.web).toBeNull();
    expect(searchWeb).not.toHaveBeenCalled();
  });

  it("defaults activeAction to null when there is no goal", async () => {
    const result = await buildContext(makeInput());
    expect(result.activeAction).toBeNull();
  });

  it("uses the no-goal default action text", async () => {
    const result = await buildContext(makeInput({ activeGoal: null }));
    expect(result.defaultAction).toContain("Define una sola");
  });

  it("always includes the legal disclaimer in coachContext", async () => {
    const result = await buildContext(makeInput());
    const legal = result.coachContext.legal as { limitsNote: string; critical: boolean };
    expect(legal.critical).toBe(false);
    expect(legal.limitsNote).toContain("no sustituye");
  });

  it("passes the session access block through", async () => {
    const result = await buildContext(
      makeInput({
        conversionTrigger: true,
        session: { userPlan: "pro", remainingMessages: null, hasActiveGoal: true },
      })
    );
    expect(result.coachContext.access).toEqual({
      userPlan: "pro",
      remainingMessages: null,
      hasActiveGoal: true,
      conversionTrigger: true,
    });
  });

  it("copies the flow context into coachContext.flow", async () => {
    const result = await buildContext(
      makeInput({
        flowContext: {
          currentIntent: "exploration",
          currentStep: 3,
          activeFlow: "goal-setting",
          instruction: "Ask about obstacles",
        },
      })
    );
    expect(result.coachContext.flow).toEqual({
      currentIntent: "exploration",
      currentStep: 3,
      activeFlow: "goal-setting",
      instruction: "Ask about obstacles",
    });
  });
});

// ─── Goals path ───────────────────────────────────────────────────────────────

describe("buildContext — goal integration", () => {
  const goalWithAction = {
    id: "goal_1",
    title: "Escribir cada día",
    actions: [
      { id: "act_1", description: "Escribir 20 minutos", completed: false },
      { id: "act_2", description: "Releer lo escrito", completed: true },
    ],
  };

  it("uses the with-goal default action text when a goal exists", async () => {
    const result = await buildContext(
      makeInput({ activeGoal: goalWithAction as ContextInput["activeGoal"] })
    );
    expect(result.defaultAction).toContain("Cierra hoy una sola");
  });

  it("surfaces the first pending action when goals returns one", async () => {
    (getFirstPendingAction as jest.Mock).mockReturnValue({
      id: "act_1",
      description: "Escribir 20 minutos",
    });
    const result = await buildContext(
      makeInput({ activeGoal: goalWithAction as ContextInput["activeGoal"] })
    );
    expect(result.activeAction).toEqual({
      id: "act_1",
      description: "Escribir 20 minutos",
    });
  });

  it("calls buildGoalCoachContext with avoidance counters from the input", async () => {
    await buildContext(
      makeInput({
        activeGoal: goalWithAction as ContextInput["activeGoal"],
        goalAvoidanceCount: 2,
        avoidanceDetectedThisTurn: true,
      })
    );
    expect(buildGoalCoachContext).toHaveBeenCalledWith(
      goalWithAction,
      expect.any(String),
      { avoidanceCount: 2, avoidanceDetected: true }
    );
  });

  it("marks hesitationDetected=true when avoidanceCount > 0", async () => {
    const result = await buildContext(makeInput({ goalAvoidanceCount: 1 }));
    const continuity = result.coachContext.continuity as { hesitationDetected: boolean };
    expect(continuity.hesitationDetected).toBe(true);
  });

  it("marks hesitationDetected=true when avoidanceDetectedThisTurn is true", async () => {
    const result = await buildContext(makeInput({ avoidanceDetectedThisTurn: true }));
    const continuity = result.coachContext.continuity as { hesitationDetected: boolean };
    expect(continuity.hesitationDetected).toBe(true);
  });

  it("marks hesitationDetected=false when no avoidance signal", async () => {
    const result = await buildContext(makeInput());
    const continuity = result.coachContext.continuity as { hesitationDetected: boolean };
    expect(continuity.hesitationDetected).toBe(false);
  });
});

// ─── Web search path ──────────────────────────────────────────────────────────

describe("buildContext — web search", () => {
  it("runs web search when classifyExternalInfoNeed and needsExternalInfo both signal true", async () => {
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({ shouldUse: true });
    (needsExternalInfo as jest.Mock).mockReturnValue(true);
    (buildSearchQuery as jest.Mock).mockReturnValue("mejor hora para dormir");
    (searchWeb as jest.Mock).mockResolvedValue([
      { title: "Sleep", url: "https://x", snippet: "..." },
    ]);

    const result = await buildContext(makeInput({ message: "¿cuál es la mejor hora para dormir?" }));
    expect(searchWeb).toHaveBeenCalledWith("mejor hora para dormir", 3);
    expect(result.searchQuery).toBe("mejor hora para dormir");
    expect(result.searchResults).toHaveLength(1);
    expect(result.coachContext.web).toEqual({
      query: "mejor hora para dormir",
      usage: "practical_decision",
      results: [{ title: "Sleep", url: "https://x", snippet: "..." }],
    });
  });

  it("does not search when needsExternalInfo is false", async () => {
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({ shouldUse: true });
    (needsExternalInfo as jest.Mock).mockReturnValue(false);
    const result = await buildContext(makeInput());
    expect(searchWeb).not.toHaveBeenCalled();
    expect(result.coachContext.web).toBeNull();
  });

  it("does not search when classifyExternalInfoNeed.shouldUse is false", async () => {
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({ shouldUse: false });
    (needsExternalInfo as jest.Mock).mockReturnValue(true);
    const result = await buildContext(makeInput());
    expect(searchWeb).not.toHaveBeenCalled();
    expect(result.coachContext.web).toBeNull();
  });

  it("skips search when buildSearchQuery returns null even if gates pass", async () => {
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({ shouldUse: true });
    (needsExternalInfo as jest.Mock).mockReturnValue(true);
    (buildSearchQuery as jest.Mock).mockReturnValue(null);
    const result = await buildContext(makeInput());
    expect(searchWeb).not.toHaveBeenCalled();
    expect(result.searchQuery).toBeNull();
    expect(result.coachContext.web).toBeNull();
  });

  it("logs error and returns empty results when searchWeb rejects", async () => {
    (classifyExternalInfoNeed as jest.Mock).mockReturnValue({ shouldUse: true });
    (needsExternalInfo as jest.Mock).mockReturnValue(true);
    (buildSearchQuery as jest.Mock).mockReturnValue("q");
    (searchWeb as jest.Mock).mockRejectedValue(new Error("network"));
    const result = await buildContext(makeInput());
    expect(logError).toHaveBeenCalled();
    expect(result.searchResults).toEqual([]);
    // web block still populated with query but empty results
    const web = result.coachContext.web as { results: unknown[] };
    expect(web.results).toEqual([]);
  });
});

// ─── Parallel fetches & error tolerance ──────────────────────────────────────

describe("buildContext — parallel fetches", () => {
  it("returns values from impulse/journey services when they succeed", async () => {
    (getUserImpulseProfile as jest.Mock).mockResolvedValue({ id: "prof_1" });
    (listRecentImpulseLogs as jest.Mock).mockResolvedValue([{ id: "log_1" }]);
    (buildJourneyPromptBlock as jest.Mock).mockResolvedValue("Journey block text");

    const result = await buildContext(makeInput());
    expect(result.impulseProfile).toEqual({ id: "prof_1" });
    expect(result.impulseLogs).toEqual([{ id: "log_1" }]);
    expect(result.coachContext.journeyPrompt).toBe("Journey block text");
  });

  it("falls back to null when impulse profile fetch rejects", async () => {
    (getUserImpulseProfile as jest.Mock).mockRejectedValue(new Error("db error"));
    const result = await buildContext(makeInput());
    expect(result.impulseProfile).toBeNull();
  });

  it("falls back to empty array when impulse logs fetch rejects", async () => {
    (listRecentImpulseLogs as jest.Mock).mockRejectedValue(new Error("db error"));
    const result = await buildContext(makeInput());
    expect(result.impulseLogs).toEqual([]);
  });

  it("falls back to null when journey prompt fetch rejects", async () => {
    (buildJourneyPromptBlock as jest.Mock).mockRejectedValue(new Error("journey error"));
    const result = await buildContext(makeInput());
    expect(result.coachContext.journeyPrompt).toBeNull();
  });
});
