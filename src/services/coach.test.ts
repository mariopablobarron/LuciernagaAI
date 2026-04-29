import {
  buildActionRequiredMessage,
  buildCoachPrompt,
  buildFallbackResponse,
  finalizeResponse,
} from "@/services/coach";

describe("coach prompt identity", () => {
  it("integra la identidad central de Tres Mil Millones de Latidos", () => {
    const prompt = buildCoachPrompt("duda");

    expect(prompt).toContain("Tres Mil Millones de Latidos");
    expect(prompt).toContain("Interpelar > instruir");
    expect(prompt).toContain("Claridad > consuelo");
    expect(prompt).toContain("descubras lo que ya sabes");
    expect(prompt).toContain("Reflejo: demuestra que entiendes");
    expect(prompt).toContain("Pregunta que abre");
    expect(prompt).toContain("Local → global");
  });

  it("añade pregunta de cierre cuando la respuesta queda sin interpelar", () => {
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

    // Ya no forzamos la línea de acción tipo "Haz una versión mínima…" en
    // todos los turnos — delataba plantilla. Solo reforzamos con pregunta.
    expect(response).toContain("Entiendo lo que te pasa.");
    expect(response).toContain("¿Cuál es el paso más pequeño");
    expect(response).not.toContain("Haz una versión mínima");
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

    expect(message).toContain("Hay algo de antes que seguimos sin cerrar");
    expect(message).toContain("ya lo hiciste");
    expect(message).toContain("lo retomas ahora");
    expect(message).toContain("lo aparcas para más tarde");
  });

  it("usa un fallback más activo cuando falla la IA", () => {
    expect(buildFallbackResponse()).toContain("qué estás evitando ahora mismo");
    expect(buildFallbackResponse("bloqueo")).toContain("posponiendo");
    expect(buildFallbackResponse("ansiedad")).toContain("presiona");
    expect(buildFallbackResponse("duda")).toContain("opciones");
    expect(buildFallbackResponse("claridad")).toContain("paso más concreto");
  });
});

import { sanitizeCoachResponse } from "@/services/coach";

describe("sanitizeCoachResponse", () => {
  it("strips headers Markdown tipo **Reflejo:**", () => {
    const out = sanitizeCoachResponse("**Reflejo:** Lo que describes es duro.");
    expect(out).toBe("Lo que describes es duro.");
  });

  it("strips múltiples headers en una respuesta", () => {
    const input = `**Reflejo:** Llevas mucho.

**Porqué:** Detrás del cansancio veo agotamiento.

**Pregunta:** ¿Qué necesitas?`;
    const out = sanitizeCoachResponse(input);
    expect(out).not.toContain("**Reflejo:**");
    expect(out).not.toContain("**Porqué:**");
    expect(out).not.toContain("**Pregunta:**");
    expect(out).toContain("Llevas mucho");
    expect(out).toContain("Detrás del cansancio");
    expect(out).toContain("¿Qué necesitas?");
  });

  it("strips variantes con punto y sin punto", () => {
    expect(sanitizeCoachResponse("**Acción.** Haz X.")).toBe("Haz X.");
    expect(sanitizeCoachResponse("**Acción** Haz X.")).toBe("Haz X.");
    expect(sanitizeCoachResponse("**Acción para hoy:** Haz X.")).toBe("Haz X.");
    expect(sanitizeCoachResponse("**Acción posible:** Haz X.")).toBe("Haz X.");
    expect(sanitizeCoachResponse("**Microacción:** Pausa 5 min.")).toBe("Pausa 5 min.");
  });

  it("trunca dos preguntas consecutivas a la última", () => {
    const out = sanitizeCoachResponse("¿Qué sientes? ¿Qué harías ahora?");
    expect(out).toBe("¿Qué harías ahora?");
  });

  it("trunca tres preguntas consecutivas a la última", () => {
    const out = sanitizeCoachResponse("¿A? ¿B? ¿C?");
    expect(out).toBe("¿C?");
  });

  it("conserva preguntas separadas por párrafos", () => {
    const input = "Detrás de eso hay miedo.\n\n¿Es eso lo que sientes?\n\nLa próxima vez que pase, pausa.\n\n¿Qué necesitarías recibir tú?";
    const out = sanitizeCoachResponse(input);
    // Ambas preguntas deben sobrevivir porque están en párrafos distintos
    expect(out).toContain("¿Es eso lo que sientes?");
    expect(out).toContain("¿Qué necesitarías recibir tú?");
  });

  it("trunca pregunta unida con guion", () => {
    const out = sanitizeCoachResponse("¿Qué sientes? — ¿Qué harías?");
    expect(out).toBe("¿Qué harías?");
  });

  it("no toca respuestas con UNA sola pregunta", () => {
    const input = "Lo que describes me dice que cargas mucho. ¿Qué necesitas?";
    expect(sanitizeCoachResponse(input)).toBe(input);
  });

  it("no toca respuestas sin headers ni preguntas", () => {
    const input = "Estoy contigo. Vamos paso a paso.";
    expect(sanitizeCoachResponse(input)).toBe(input);
  });

  it("limpia saltos de línea triples y espacios duplicados", () => {
    const out = sanitizeCoachResponse("Hola.\n\n\n\nQué tal.");
    expect(out).toBe("Hola.\n\nQué tal.");
  });

  it("elimina negrita suelta usada como pseudo-header de insight", () => {
    const input = "Lo que describes es duro.\n\n**El miedo no es al caos sino a no saber quién eres.**\n\n¿Qué te asusta concretamente?";
    const out = sanitizeCoachResponse(input);
    expect(out).toBe("Lo que describes es duro.\n\nEl miedo no es al caos sino a no saber quién eres.\n\n¿Qué te asusta concretamente?");
  });

  it("elimina negrita inline en medio de frase", () => {
    const out = sanitizeCoachResponse("Eso no es **solo** cansancio, es agotamiento.");
    expect(out).toBe("Eso no es solo cansancio, es agotamiento.");
  });

  it("elimina cursiva con asterisco simple", () => {
    const out = sanitizeCoachResponse("Eso es *exactamente* lo que pasa.");
    expect(out).toBe("Eso es exactamente lo que pasa.");
  });
});

describe("audience guidance by tier", () => {
  it("no añade nada cuando no hay tier", () => {
    const prompt = buildCoachPrompt("duda");
    expect(prompt).not.toContain("Audiencia: ADOLESCENTE");
    expect(prompt).not.toContain("Audiencia: PERSONA MAYOR");
  });

  it("inyecta guía de adolescente cuando tier=minor", () => {
    const prompt = buildCoachPrompt("duda", undefined, { audience: { tier: "minor" } });
    expect(prompt).toContain("Audiencia: ADOLESCENTE");
    expect(prompt).toContain("Fundación ANAR");
  });

  it("inyecta guía de mayor cuando tier=elder", () => {
    const prompt = buildCoachPrompt("duda", undefined, { audience: { tier: "elder" } });
    expect(prompt).toContain("Audiencia: PERSONA MAYOR");
  });

  it("no añade nada cuando tier=adult (es el default)", () => {
    const prompt = buildCoachPrompt("duda", undefined, { audience: { tier: "adult" } });
    expect(prompt).not.toContain("Audiencia:");
  });
});
