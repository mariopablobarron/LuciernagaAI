import { getConversationalOnboarding } from "@/services/onboarding";

describe("conversational onboarding", () => {
  it("se activa en los primeros turnos para llevar a foco y acción", () => {
    const onboarding = getConversationalOnboarding({
      state: "bloqueo",
      intent: "avoidance",
      hasGoal: false,
      pendingActionsCount: 0,
      conversationMessageCount: 1,
      goalCreatedThisTurn: false,
      actionGeneratedThisTurn: false,
    });

    expect(onboarding.active).toBe(true);
    expect(onboarding.stage).toBe("opening");
    expect(onboarding.targetOutcome).toContain("problema real");
  });

  it("sube a primera acción cuando ya hay objetivo o salida práctica", () => {
    const onboarding = getConversationalOnboarding({
      state: "claridad",
      intent: "decision",
      hasGoal: true,
      pendingActionsCount: 1,
      conversationMessageCount: 2,
      goalCreatedThisTurn: true,
      actionGeneratedThisTurn: true,
    });

    expect(onboarding.stage).toBe("first_action");
    expect(onboarding.targetOutcome).toContain("primera acción");
  });
});
