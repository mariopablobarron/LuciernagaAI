/**
 * Tests for phases/intercept.ts — Phase 3 of the processMessage pipeline.
 *
 * Covers interceptActionLock, interceptCrisis, interceptTransitionalVoid.
 * Each intercepts returns either {intercepted: true, data} or {intercepted: false}.
 */

const mockPrismaUserStateUpsert = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock("@/lib/n8n", () => ({
  dispatchN8nEvent: jest.fn(),
}));

jest.mock("@/lib/alerts", () => ({
  sendCrisisEscalationAlert: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/risk", () => ({
  getCrisisResponse: jest.fn().mockReturnValue({
    response: "Estoy contigo. Llama al 024.",
    resources: [{ name: "Línea 024", url: "tel:024" }],
    shouldEscalate: true,
    legalFlag: true,
    disclaimer: "No sustituye terapia.",
    continueChat: false,
  }),
  registerCrisisEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/coach", () => ({
  appendCaptureEmailPrompt: jest.fn((msg: string) => `${msg} [captura-email]`),
  buildActionRequiredMessage: jest.fn().mockReturnValue("Acción pendiente"),
}));

jest.mock("@/services/conversation", () => ({
  saveConversationMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/events", () => ({
  trackSafe: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/domain/decisionEngine", () => ({
  generateDecision: jest.fn().mockReturnValue({
    action: "CONTAIN",
    rationale: "crisis",
    expectedImpact: 1,
  }),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    userState: { upsert: mockPrismaUserStateUpsert },
  }),
}));

import {
  interceptActionLock,
  interceptCrisis,
  interceptTransitionalVoid,
  type InterceptInput,
} from "./intercept";
import { saveConversationMessage } from "@/services/conversation";
import { appendCaptureEmailPrompt } from "@/services/coach";
import { getCrisisResponse, registerCrisisEvent } from "@/services/risk";
import { sendCrisisEscalationAlert } from "@/lib/alerts";
import { dispatchN8nEvent } from "@/lib/n8n";
import { trackSafe } from "@/services/events";
import { logError } from "@/lib/logger";

// ─── Base input ───────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<InterceptInput> = {}): InterceptInput {
  return {
    userId: "usr_test",
    message: "Hola",
    state: "neutral",
    conversationId: "conv_1",
    persistenceAvailable: true,
    flowContext: {
      currentIntent: "clarification",
      currentStep: 0,
      activeFlow: null,
      instruction: null,
    },
    emotionalProfile: {
      primaryEmotion: "calma",
      dominantPattern: "evita_decidir",
      focusArea: "propósito",
      energyLevel: "medio",
      riskLevel: "low",
      progressTrend: "igual",
    } as InterceptInput["emotionalProfile"],
    crisisMode: false,
    crisisSource: "none",
    crisisActiveUntil: null,
    riskLevel: "low",
    actionLockPayload: null,
    actionLockAssistantMessage: null,
    captureEmailRecommended: false,
    captureEmailMessage: "",
    domainState: "ESTABLE",
    domainDecision: {
      type: "MANTENER_RUMBO",
      reason: "ok",
      confidence: "medium",
      recommendedActions: [],
    },
    activeGoal: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── interceptActionLock ──────────────────────────────────────────────────────

describe("interceptActionLock", () => {
  it("returns intercepted:false when no action lock payload", async () => {
    const result = await interceptActionLock(makeInput());
    expect(result.intercepted).toBe(false);
    expect(saveConversationMessage).not.toHaveBeenCalled();
  });

  it("returns intercepted:false when payload exists but message is null", async () => {
    const result = await interceptActionLock(
      makeInput({ actionLockPayload: { type: "action_required" }, actionLockAssistantMessage: null })
    );
    expect(result.intercepted).toBe(false);
  });

  it("returns intercepted data when action lock is set", async () => {
    const result = await interceptActionLock(
      makeInput({
        actionLockPayload: { type: "action_required", actionId: "act_1" },
        actionLockAssistantMessage: "Tienes una acción pendiente",
      })
    );
    expect(result.intercepted).toBe(true);
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.type).toBe("action_required");
    expect(result.data.message).toBe("Tienes una acción pendiente");
    expect(result.data.response).toBe("Tienes una acción pendiente");
    expect(result.data.captureEmail).toBe(false);
  });

  it("appends capture email prompt when recommended", async () => {
    const result = await interceptActionLock(
      makeInput({
        actionLockPayload: { type: "action_required" },
        actionLockAssistantMessage: "Base",
        captureEmailRecommended: true,
        captureEmailMessage: "Deja tu email",
      })
    );
    // 3er arg = locale; el test no lo provee, llega como undefined
    // (back-compat: appendCaptureEmailPrompt(response, shouldAsk, locale?))
    expect(appendCaptureEmailPrompt).toHaveBeenCalledWith("Base", true, undefined);
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.message).toBe("Base [captura-email]");
    expect(result.data.captureEmail).toBe(true);
    expect(result.data.captureEmailMessage).toBe("Deja tu email");
  });

  it("persists the assistant message when persistenceAvailable is true", async () => {
    await interceptActionLock(
      makeInput({
        actionLockPayload: { type: "action_required" },
        actionLockAssistantMessage: "Haz la acción",
      })
    );
    expect(saveConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv_1",
        userId: "usr_test",
        role: "assistant",
        content: "Haz la acción",
      })
    );
  });

  it("skips persistence when persistenceAvailable is false", async () => {
    await interceptActionLock(
      makeInput({
        persistenceAvailable: false,
        actionLockPayload: { type: "action_required" },
        actionLockAssistantMessage: "Haz la acción",
      })
    );
    expect(saveConversationMessage).not.toHaveBeenCalled();
  });

  it("still returns intercepted when persistence fails", async () => {
    (saveConversationMessage as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const result = await interceptActionLock(
      makeInput({
        actionLockPayload: { type: "action_required" },
        actionLockAssistantMessage: "Haz la acción",
      })
    );
    expect(result.intercepted).toBe(true);
    expect(logError).toHaveBeenCalled();
  });
});

// ─── interceptCrisis ──────────────────────────────────────────────────────────

describe("interceptCrisis", () => {
  it("returns intercepted:false when crisisMode is false", async () => {
    const result = await interceptCrisis(makeInput({ crisisMode: false }));
    expect(result.intercepted).toBe(false);
    expect(getCrisisResponse).not.toHaveBeenCalled();
  });

  it("returns crisis payload when crisisMode is true and riskLevel is high", async () => {
    const result = await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "high" }));
    expect(result.intercepted).toBe(true);
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.type).toBe("crisis");
    expect(result.data.systemState).toBe("CRISIS");
    expect(result.data.crisis).toBe(true);
    expect(result.data.riskLevel).toBe("high");
    expect(getCrisisResponse).toHaveBeenCalledWith("high", null);
  });

  it("uses critical containment when risk is critical", async () => {
    const result = await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "critical" }));
    expect(getCrisisResponse).toHaveBeenCalledWith("critical", null);
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.riskLevel).toBe("critical");
    expect(result.data.detectedRiskLevel).toBe("critical");
  });

  it("defaults containment to 'high' when crisisMode is true from active_state with low risk", async () => {
    const result = await interceptCrisis(
      makeInput({ crisisMode: true, crisisSource: "active_state", riskLevel: "low" })
    );
    expect(getCrisisResponse).toHaveBeenCalledWith("high", null);
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.riskLevel).toBe("high");
    expect(result.data.detectedRiskLevel).toBe("low");
  });

  it("registers the crisis event and sends the escalation alert", async () => {
    await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "high", message: "no quiero seguir" }));
    expect(registerCrisisEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "usr_test",
        level: "high",
        message: "no quiero seguir",
      })
    );
    expect(sendCrisisEscalationAlert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "usr_test", level: "high" })
    );
  });

  it("persists the crisis response to the conversation", async () => {
    await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "high" }));
    expect(saveConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "assistant",
        content: "Estoy contigo. Llama al 024.",
      })
    );
  });

  it("skips persistence when persistenceAvailable is false", async () => {
    await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "high", persistenceAvailable: false }));
    expect(saveConversationMessage).not.toHaveBeenCalled();
  });

  it("still returns intercepted when persistence fails", async () => {
    (saveConversationMessage as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const result = await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "high" }));
    expect(result.intercepted).toBe(true);
    expect(logError).toHaveBeenCalled();
  });

  it("includes crisis resources and legal flags in the payload", async () => {
    const result = await interceptCrisis(makeInput({ crisisMode: true, riskLevel: "high" }));
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.alerts).toEqual([{ name: "Línea 024", url: "tel:024" }]);
    expect(result.data.legalFlag).toBe(true);
    expect(result.data.legalDisclaimer).toBe("No sustituye terapia.");
  });
});

// ─── interceptTransitionalVoid ────────────────────────────────────────────────

describe("interceptTransitionalVoid", () => {
  it("returns intercepted:false when domainState is not TRANSITIONAL_VOID", async () => {
    const result = await interceptTransitionalVoid(makeInput({ domainState: "ESTABLE" }));
    expect(result.intercepted).toBe(false);
  });

  it("returns intercepted:false when domainState is TV but crisisMode is true (crisis wins)", async () => {
    const result = await interceptTransitionalVoid(
      makeInput({ domainState: "TRANSITIONAL_VOID", crisisMode: true })
    );
    expect(result.intercepted).toBe(false);
  });

  it("returns TV intercept payload when domainState is TRANSITIONAL_VOID", async () => {
    const result = await interceptTransitionalVoid(
      makeInput({ domainState: "TRANSITIONAL_VOID" })
    );
    expect(result.intercepted).toBe(true);
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.type).toBe("transitional_void");
    expect(result.data.systemState).toBe("TRANSITIONAL_VOID");
    expect(typeof result.data.response).toBe("string");
    expect(result.data.response).toContain("transición");
  });

  it("tracks the TV event via trackSafe", async () => {
    await interceptTransitionalVoid(makeInput({ domainState: "TRANSITIONAL_VOID" }));
    expect(trackSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "usr_test",
        type: "TRANSITIONAL_VOID_DETECTED",
      })
    );
  });

  it("dispatches the n8n event", async () => {
    await interceptTransitionalVoid(makeInput({ domainState: "TRANSITIONAL_VOID" }));
    expect(dispatchN8nEvent).toHaveBeenCalledWith(
      "state.transitional_void",
      { state: "TRANSITIONAL_VOID" },
      "usr_test"
    );
  });

  it("persists the TV response and upserts userState when persistenceAvailable is true", async () => {
    await interceptTransitionalVoid(makeInput({ domainState: "TRANSITIONAL_VOID" }));
    expect(saveConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant" })
    );
    expect(mockPrismaUserStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "usr_test" },
        update: { systemState: "TRANSITIONAL_VOID" },
      })
    );
  });

  it("skips DB writes when persistenceAvailable is false", async () => {
    await interceptTransitionalVoid(
      makeInput({ domainState: "TRANSITIONAL_VOID", persistenceAvailable: false })
    );
    expect(saveConversationMessage).not.toHaveBeenCalled();
    expect(mockPrismaUserStateUpsert).not.toHaveBeenCalled();
  });

  it("swallows persistence errors silently (non-critical)", async () => {
    (saveConversationMessage as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const result = await interceptTransitionalVoid(
      makeInput({ domainState: "TRANSITIONAL_VOID" })
    );
    expect(result.intercepted).toBe(true);
  });

  it("includes the serialized flow context in the payload", async () => {
    const result = await interceptTransitionalVoid(
      makeInput({
        domainState: "TRANSITIONAL_VOID",
        flowContext: {
          currentIntent: "exploration",
          currentStep: 2,
          activeFlow: "goal-setting",
          instruction: "ask_obstacles",
        },
      })
    );
    if (!result.intercepted) throw new Error("unreachable");
    expect(result.data.flow).toEqual({
      currentIntent: "exploration",
      currentStep: 2,
      activeFlow: "goal-setting",
      instruction: "ask_obstacles",
    });
  });
});
