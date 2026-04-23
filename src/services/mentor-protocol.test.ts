import {
  getMentorMode,
  shouldAskForEmail,
  shouldAskForName,
} from "@/services/mentor-protocol";

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

  it("pide email cuando hay señal de valor real (commitment, conversión o volumen)", () => {
    // Commitment existente (goal creado) → pide email aunque sea primer msg.
    expect(
      shouldAskForEmail({
        isAnonymous: true,
        hasName: true,
        goalCount: 1,
        actionCount: 0,
        conversationMessageCount: 1,
      })
    ).toBe(true);

    // Mensajes pocos y sin commitment → aún no.
    expect(
      shouldAskForEmail({
        isAnonymous: true,
        hasName: true,
        goalCount: 0,
        actionCount: 0,
        conversationMessageCount: 2,
      })
    ).toBe(false);

    // Conversación larga aunque no haya commitment → pide email.
    expect(
      shouldAskForEmail({
        isAnonymous: true,
        hasName: true,
        goalCount: 0,
        actionCount: 0,
        conversationMessageCount: 4,
      })
    ).toBe(true);

    // Señal explícita de conversión → pide aunque aún no haya conversación.
    expect(
      shouldAskForEmail({
        isAnonymous: true,
        hasName: true,
        goalCount: 0,
        actionCount: 0,
        conversationMessageCount: 1,
        conversionTrigger: true,
      })
    ).toBe(true);

    // Usuario ya registrado → nunca.
    expect(
      shouldAskForEmail({
        isAnonymous: false,
        hasName: true,
        goalCount: 5,
        actionCount: 5,
        conversationMessageCount: 50,
        conversionTrigger: true,
      })
    ).toBe(false);
  });

  it("no pide email antes de capturar el nombre", () => {
    // Mismo caso que antes (conversión + commitment) pero SIN nombre → no pide email.
    expect(
      shouldAskForEmail({
        isAnonymous: true,
        hasName: false,
        goalCount: 1,
        actionCount: 1,
        conversationMessageCount: 5,
        conversionTrigger: true,
      })
    ).toBe(false);
  });
});

describe("shouldAskForName", () => {
  it("no pide nombre a usuarios ya registrados", () => {
    expect(
      shouldAskForName({ isAnonymous: false, hasName: false, conversationMessageCount: 5 })
    ).toBe(false);
  });

  it("no pide nombre si el usuario ya tiene uno", () => {
    expect(
      shouldAskForName({ isAnonymous: true, hasName: true, conversationMessageCount: 5 })
    ).toBe(false);
  });

  it("no pide nombre antes del primer mensaje", () => {
    expect(
      shouldAskForName({ isAnonymous: true, hasName: false, conversationMessageCount: 0 })
    ).toBe(false);
  });

  it("pide nombre a usuario anónimo sin nombre tras al menos un mensaje", () => {
    expect(
      shouldAskForName({ isAnonymous: true, hasName: false, conversationMessageCount: 1 })
    ).toBe(true);
    expect(
      shouldAskForName({ isAnonymous: true, hasName: false, conversationMessageCount: 7 })
    ).toBe(true);
  });
});
