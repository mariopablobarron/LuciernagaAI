import {
  buildActionRequiredMessage,
  buildCoachPrompt,
  buildFallbackResponse,
  finalizeResponse,
} from "@/services/coach";

describe("coach prompt identity", () => {
  it("integra la identidad central de Tres Mil Millones de Latidos", () => {
    const prompt = buildCoachPrompt("duda");

    expect(prompt).toContain("Eres Luciérnaga AI.");
    expect(prompt).toContain("No eres un chatbot.");
    expect(prompt).toContain("Claridad sobre consuelo");
    expect(prompt).toContain("Acción sobre reflexión vacía");
    expect(prompt).toContain("No estoy aquí para entretener. Estoy aquí para ayudarte a avanzar.");
    expect(prompt).toContain("Reflejo: demuestra que has entendido");
    expect(prompt).toContain("Nunca cierres en vacío.");
  });

  it("fuerza cierre con acción y pregunta cuando la respuesta queda vacía", () => {
    const response = finalizeResponse("Entiendo lo que te pasa.", {
      state: "bloqueo",
      onboarding: {
        active: true,
        stage: "opening",
        intent: "problem",
        starterQuestion: "¿Qué llevas semanas evitando hacer?",
        targetOutcome: "Nombrar el problema real sin rodeos.",
      },
    });

    expect(response).toContain("Haz una versión mínima");
    expect(response).toContain("¿Cuál es el paso más pequeño");
  });

  it("vuelve más firme el seguimiento cuando hay acción pendiente y confrontación", () => {
    const response = finalizeResponse("Te escucho.", {
      state: "claridad",
      mentor: {
        mode: "confrontation",
        validate: false,
        confront: true,
        pushAction: true,
        stopConversation: false,
        reason: "evasión",
      },
      goal: {
        title: "Cerrar un asunto pendiente",
        progress: 0,
        pendingActions: ["Enviar el mensaje"],
        activeAction: "Enviar el mensaje",
        avoidanceDetected: true,
        avoidanceCount: 2,
        unfinishedActionsCount: 1,
        confrontationMode: true,
      },
    });

    expect(response).toContain("No necesitas seguir dándole vueltas");
    expect(response).toContain("¿Lo haces hoy o sigues evitando lo importante?");
  });

  it("refuerza el action lock cuando la deuda ya es repetida", () => {
    const message = buildActionRequiredMessage({
      goalTitle: "Definir siguiente paso",
      actionTitle: "Enviar el mensaje",
      avoidanceCount: 2,
      unfinishedActionsCount: 3,
      mentorMode: {
        mode: "confrontation",
        validate: false,
        confront: true,
        pushAction: true,
        stopConversation: false,
        reason: "evasión repetida",
      },
    });

    expect(message).toContain("No te voy a ayudar a abrir otro frente");
  });

  it("usa un fallback más activo cuando falla la IA", () => {
    expect(buildFallbackResponse()).toContain("qué estás evitando ahora mismo");
  });
});
