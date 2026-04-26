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

jest.mock("@/services/embeddings", () => ({
  embed: jest.fn(),
}));

jest.mock("@/services/semantic-memory", () => ({
  retrieveSemanticMemory: jest.fn(),
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

// ─── Semantic memory (PR2) ───────────────────────────────────────────────────

import { embed } from "@/services/embeddings";
import { retrieveSemanticMemory } from "@/services/semantic-memory";

describe("buildContext — semantic memory", () => {
  const ORIGINAL_FLAG = process.env.SEMANTIC_MEMORY_ENABLED;
  const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.SEMANTIC_MEMORY_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test";
    (embed as jest.Mock).mockResolvedValue(new Array(1536).fill(0.1));
    (retrieveSemanticMemory as jest.Mock).mockResolvedValue([]);
  });

  afterAll(() => {
    if (ORIGINAL_FLAG === undefined) delete process.env.SEMANTIC_MEMORY_ENABLED;
    else process.env.SEMANTIC_MEMORY_ENABLED = ORIGINAL_FLAG;
    if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = ORIGINAL_KEY;
  });

  it("pastEchoes is null when feature flag is off", async () => {
    process.env.SEMANTIC_MEMORY_ENABLED = "false";
    const result = await buildContext(makeInput());
    expect(result.coachContext.pastEchoes).toBeNull();
    expect(embed).not.toHaveBeenCalled();
    expect(retrieveSemanticMemory).not.toHaveBeenCalled();
  });

  it("pastEchoes is null when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await buildContext(makeInput());
    expect(result.coachContext.pastEchoes).toBeNull();
    expect(embed).not.toHaveBeenCalled();
  });

  it("pastEchoes is null for anonymous users (anonymous-first)", async () => {
    const result = await buildContext(makeInput({ isAnonymous: true }));
    expect(result.coachContext.pastEchoes).toBeNull();
    expect(embed).not.toHaveBeenCalled();
  });

  it("pastEchoes is null when crisis mode is active", async () => {
    const result = await buildContext(makeInput({ crisisMode: true }));
    expect(result.coachContext.pastEchoes).toBeNull();
    expect(embed).not.toHaveBeenCalled();
  });

  it("pastEchoes is null when retrieve returns no hits", async () => {
    (retrieveSemanticMemory as jest.Mock).mockResolvedValue([]);
    const result = await buildContext(makeInput());
    expect(result.coachContext.pastEchoes).toBeNull();
  });

  it("maps hits to pastEchoes with daysAgo and source", async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    (retrieveSemanticMemory as jest.Mock).mockResolvedValue([
      {
        id: "sm_1",
        source: "daily_log",
        sourceId: "dl_1",
        content: "Hoy me sentí bloqueado de nuevo, igual que la semana pasada.",
        metadata: null,
        similarity: 0.85,
        createdAt: fiveDaysAgo,
      },
    ]);

    const result = await buildContext(makeInput({ message: "vuelvo a estar bloqueado" }));
    const echoes = result.coachContext.pastEchoes as Array<{
      source: string;
      gist: string;
      daysAgo: number;
      similarity: number;
    }>;
    expect(echoes).toHaveLength(1);
    expect(echoes[0].source).toBe("daily_log");
    expect(echoes[0].daysAgo).toBe(5);
    expect(echoes[0].similarity).toBeCloseTo(0.85, 2);
    expect(echoes[0].gist).toContain("bloqueado");
  });

  it("uses queryHint when provided instead of raw message", async () => {
    await buildContext(makeInput({ message: "y por qué", queryHint: "por qué evito tomar la decisión" }));
    expect(embed).toHaveBeenCalledWith("por qué evito tomar la decisión");
  });

  it("falls back to message when queryHint is empty", async () => {
    await buildContext(makeInput({ message: "estoy agotado del trabajo", queryHint: "  " }));
    expect(embed).toHaveBeenCalledWith("estoy agotado del trabajo");
  });

  it("returns null when embed throws (graceful degradation)", async () => {
    (embed as jest.Mock).mockRejectedValue(new Error("OpenAI down"));
    const result = await buildContext(makeInput());
    expect(result.coachContext.pastEchoes).toBeNull();
  });

  it("returns null when retrieveSemanticMemory throws", async () => {
    (retrieveSemanticMemory as jest.Mock).mockRejectedValue(new Error("pgvector error"));
    const result = await buildContext(makeInput());
    expect(result.coachContext.pastEchoes).toBeNull();
  });
});
