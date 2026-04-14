/**
 * Tests for phases/analyze.ts — Phase 1 of the processMessage pipeline.
 *
 * The module mixes pure functions (tested with real logic) and one async
 * function (analyzeMessage) whose dependencies must be mocked.
 */

jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("@/services/state", () => ({
  detectUserState: jest.fn().mockReturnValue("neutral"),
}));

jest.mock("@/services/risk", () => ({
  detectRiskLevel: jest.fn().mockReturnValue("low"),
}));

jest.mock("@/services/intent", () => ({
  detectIntent: jest.fn().mockReturnValue("clarification"),
}));

jest.mock("@/services/flows", () => ({
  hydrateDialogueState: jest.fn().mockResolvedValue({
    currentIntent: "clarification",
    currentStep: 0,
    activeFlow: null,
  }),
  runFlow: jest.fn().mockReturnValue({
    currentIntent: "clarification",
    currentStep: 0,
    activeFlow: null,
    instruction: null,
  }),
  persistDialogueState: jest.fn().mockResolvedValue(undefined),
}));

import {
  analyzeMessage,
  detectTransitionalVoidSignals,
  isCrisisInterventionMessage,
  isCrisisLevel,
  mapRiskLevelToCrisisCount,
} from "./analyze";
import { detectUserState } from "@/services/state";
import { detectRiskLevel } from "@/services/risk";
import { detectIntent } from "@/services/intent";
import { hydrateDialogueState, runFlow, persistDialogueState } from "@/services/flows";

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe("detectTransitionalVoidSignals", () => {
  it("returns zero signals for a neutral message", () => {
    const result = detectTransitionalVoidSignals("Hola, ¿cómo estás?");
    expect(result.confusionScore).toBe(0);
    expect(result.identityShift).toBe(false);
    expect(result.directionClarity).toBe(1);
  });

  it("detects confusion phrases", () => {
    const result = detectTransitionalVoidSignals("No sé qué hacer, estoy perdido");
    expect(result.confusionScore).toBeGreaterThan(0);
    expect(result.directionClarity).toBeLessThan(1);
  });

  it("caps confusionScore at 1 with many confusion phrases", () => {
    const msg = "no sé qué hacer, no sé qué quiero, no sé quién soy, estoy perdido, sin rumbo";
    const result = detectTransitionalVoidSignals(msg);
    expect(result.confusionScore).toBe(1);
  });

  it("detects identity shift", () => {
    const result = detectTransitionalVoidSignals("Ya no me reconozco");
    expect(result.identityShift).toBe(true);
  });

  it("combines confusion and identity shift into lower directionClarity", () => {
    const result = detectTransitionalVoidSignals("No sé qué quiero, ya no me reconozco");
    expect(result.confusionScore).toBeGreaterThan(0);
    expect(result.identityShift).toBe(true);
    expect(result.directionClarity).toBeLessThan(0.7);
  });

  it("normalizes accents so 'está' and 'esta' match the same phrases", () => {
    const withAccents = detectTransitionalVoidSignals("Estoy perdída y confundída");
    const withoutAccents = detectTransitionalVoidSignals("estoy perdida y confundida");
    expect(withAccents.confusionScore).toBe(withoutAccents.confusionScore);
  });

  it("clamps directionClarity to non-negative", () => {
    const msg = "no sé, no entiendo, estoy perdido, sin rumbo, ya no me reconozco";
    const result = detectTransitionalVoidSignals(msg);
    expect(result.directionClarity).toBeGreaterThanOrEqual(0);
  });
});

describe("isCrisisLevel", () => {
  it("returns true for high and critical", () => {
    expect(isCrisisLevel("high")).toBe(true);
    expect(isCrisisLevel("critical")).toBe(true);
  });

  it("returns false for low and medium", () => {
    expect(isCrisisLevel("low")).toBe(false);
    expect(isCrisisLevel("medium")).toBe(false);
  });
});

describe("mapRiskLevelToCrisisCount", () => {
  it("returns 1 for crisis levels and 0 otherwise", () => {
    expect(mapRiskLevelToCrisisCount("critical")).toBe(1);
    expect(mapRiskLevelToCrisisCount("high")).toBe(1);
    expect(mapRiskLevelToCrisisCount("medium")).toBe(0);
    expect(mapRiskLevelToCrisisCount("low")).toBe(0);
  });
});

describe("isCrisisInterventionMessage", () => {
  it("detects common intervention signals", () => {
    expect(isCrisisInterventionMessage("Ya hablé con mi psicólogo")).toBe(true);
    expect(isCrisisInterventionMessage("Ya pedí ayuda a un profesional")).toBe(true);
    expect(isCrisisInterventionMessage("Ya llamé al 112")).toBe(true);
    expect(isCrisisInterventionMessage("Estoy con mi familia ahora")).toBe(true);
    expect(isCrisisInterventionMessage("ya estoy seguro")).toBe(true);
  });

  it("returns false for unrelated messages", () => {
    expect(isCrisisInterventionMessage("Hola, me siento mal hoy")).toBe(false);
    expect(isCrisisInterventionMessage("No sé qué hacer")).toBe(false);
  });

  it("handles accent variations", () => {
    expect(isCrisisInterventionMessage("estoy acompañado")).toBe(true);
    expect(isCrisisInterventionMessage("estoy acompanado")).toBe(true);
  });
});

// ─── analyzeMessage — orchestrator with mocked deps ──────────────────────────

describe("analyzeMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (detectUserState as jest.Mock).mockReturnValue("neutral");
    (detectRiskLevel as jest.Mock).mockReturnValue("low");
    (detectIntent as jest.Mock).mockReturnValue("clarification");
    (hydrateDialogueState as jest.Mock).mockResolvedValue({
      currentIntent: "clarification",
      currentStep: 0,
      activeFlow: null,
    });
    (runFlow as jest.Mock).mockReturnValue({
      currentIntent: "clarification",
      currentStep: 0,
      activeFlow: null,
      instruction: null,
    });
  });

  it("composes results from all dependencies", async () => {
    const result = await analyzeMessage("usr_1", "Hola");
    expect(result.state).toBe("neutral");
    expect(result.detectedIntent).toBe("clarification");
    expect(result.riskLevel).toBe("low");
    expect(result.crisisMode).toBe(false);
    expect(result.crisisSource).toBe("none");
    expect(result.crisisActiveUntil).toBeNull();
    expect(result.flowContext).toEqual({
      currentIntent: "clarification",
      currentStep: 0,
      activeFlow: null,
      instruction: null,
    });
    expect(result.tvSignals).toBeDefined();
  });

  it("sets crisisMode and crisisSource=detected when riskLevel is high", async () => {
    (detectRiskLevel as jest.Mock).mockReturnValue("high");
    const result = await analyzeMessage("usr_1", "Me quiero morir");
    expect(result.crisisMode).toBe(true);
    expect(result.crisisSource).toBe("detected");
  });

  it("sets crisisMode and crisisSource=detected when riskLevel is critical", async () => {
    (detectRiskLevel as jest.Mock).mockReturnValue("critical");
    const result = await analyzeMessage("usr_1", "Voy a hacerlo ahora");
    expect(result.crisisMode).toBe(true);
    expect(result.crisisSource).toBe("detected");
  });

  it("computes real transitional void signals from the message", async () => {
    const result = await analyzeMessage("usr_1", "No sé qué hacer, estoy perdido");
    expect(result.tvSignals.confusionScore).toBeGreaterThan(0);
  });

  it("persists dialogue state with the updated flow context", async () => {
    (runFlow as jest.Mock).mockReturnValue({
      currentIntent: "exploration",
      currentStep: 2,
      activeFlow: "goal-setting",
      instruction: "Ask about obstacles",
    });
    await analyzeMessage("usr_1", "Quiero cambiar algo");
    expect(persistDialogueState).toHaveBeenCalledWith("usr_1", {
      currentIntent: "exploration",
      currentStep: 2,
      activeFlow: "goal-setting",
    });
  });

  it("feeds the detected intent into runFlow on top of hydrated state", async () => {
    (hydrateDialogueState as jest.Mock).mockResolvedValue({
      currentIntent: "stale",
      currentStep: 5,
      activeFlow: "old-flow",
    });
    (detectIntent as jest.Mock).mockReturnValue("fresh_intent");
    await analyzeMessage("usr_1", "mensaje");
    expect(runFlow).toHaveBeenCalledWith(
      expect.objectContaining({ currentIntent: "fresh_intent", currentStep: 5, activeFlow: "old-flow" }),
      "mensaje"
    );
  });
});
