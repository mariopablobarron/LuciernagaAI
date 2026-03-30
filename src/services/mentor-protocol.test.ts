import { getMentorMode, shouldAskForEmail } from "@/services/mentor-protocol";

describe("mentor protocol", () => {
  it("detiene la conversación en riesgo alto", () => {
    const mode = getMentorMode({
      state: "ansiedad",
      riskLevel: "high",
      transformationPhase: "bloqueo",
      activeGoal: false,
      pendingActionsCount: 0,
      avoidanceCount: 0,
      avoidanceDetected: false,
      repeatedPattern: false,
      conversationMessageCount: 1,
    });

    expect(mode.stopConversation).toBe(true);
    expect(mode.mode).toBe("containment");
  });

  it("activa confrontación si hay evasión repetida", () => {
    const mode = getMentorMode({
      state: "neutral",
      riskLevel: "low",
      transformationPhase: "accion",
      activeGoal: true,
      pendingActionsCount: 1,
      avoidanceCount: 2,
      avoidanceDetected: true,
      repeatedPattern: true,
      conversationMessageCount: 5,
    });

    expect(mode.confront).toBe(true);
    expect(mode.validate).toBe(false);
  });

  it("pide email solo cuando hay valor real acumulado", () => {
    expect(
      shouldAskForEmail({
        isAnonymous: true,
        goalCount: 1,
        actionCount: 0,
        conversationMessageCount: 1,
      })
    ).toBe(true);

    expect(
      shouldAskForEmail({
        isAnonymous: true,
        goalCount: 0,
        actionCount: 0,
        conversationMessageCount: 2,
      })
    ).toBe(false);

    expect(
      shouldAskForEmail({
        isAnonymous: true,
        goalCount: 0,
        actionCount: 0,
        conversationMessageCount: 1,
        conversionTrigger: true,
      })
    ).toBe(true);
  });
});
