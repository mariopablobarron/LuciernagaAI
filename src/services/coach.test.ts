import {
  buildActionRequiredMessage,
  buildCoachPrompt,
  buildFallbackResponse,
  detectRelationalPhase,
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

describe("detectRelationalPhase", () => {
  it("usuario nuevo (0-3 mensajes, sin goal) → acogida", () => {
    expect(detectRelationalPhase({ messageCount: 0 })).toBe("acogida");
    expect(detectRelationalPhase({ messageCount: 1 })).toBe("acogida");
    expect(detectRelationalPhase({ messageCount: 3 })).toBe("acogida");
  });

  it("usuario sin messageCount conocido → acogida (preferir blando)", () => {
    expect(detectRelationalPhase({})).toBe("acogida");
    expect(detectRelationalPhase({ messageCount: null })).toBe("acogida");
  });

  it("usuario 4-14 mensajes sin goal → curiosidad", () => {
    expect(detectRelationalPhase({ messageCount: 4 })).toBe("curiosidad");
    expect(detectRelationalPhase({ messageCount: 10 })).toBe("curiosidad");
    expect(detectRelationalPhase({ messageCount: 14 })).toBe("curiosidad");
  });

  it("usuario 15+ mensajes sin goal → interpelacion", () => {
    expect(detectRelationalPhase({ messageCount: 15 })).toBe("interpelacion");
    expect(detectRelationalPhase({ messageCount: 50 })).toBe("interpelacion");
  });

  it("usuario con goal activo → interpelacion (aunque sea primer turno)", () => {
    expect(
      detectRelationalPhase({
        messageCount: 1,
        goal: {
          title: "Cerrar contrato pendiente",
          progress: 0,
          pendingActions: [],
          activeAction: null,
          avoidanceDetected: false,
          avoidanceCount: 0,
          unfinishedActionsCount: 0,
          confrontationMode: false,
        },
      }),
    ).toBe("interpelacion");
  });

  it("usuario con varias conversaciones recientes → interpelacion", () => {
    expect(
      detectRelationalPhase({
        messageCount: 2,
        continuity: {
          lastGoal: null,
          pendingActions: [],
          emotionalState: "neutral",
          summary: "",
          weeklyPattern: {
            daysSinceLastSession: 2,
            dominantStateLast7d: "bloqueo",
            avoidanceCountLast7d: 0,
            crisisEventsLast7d: 0,
            conversationCountLast7d: 3,
          },
        },
      }),
    ).toBe("interpelacion");
  });
});

describe("buildCoachPrompt — fase relacional + anti-alucinación", () => {
  it("acogida: bloquea vocabulario de coaching duro", () => {
    const prompt = buildCoachPrompt("bloqueo", undefined, { messageCount: 1 });
    expect(prompt).toContain("FASE RELACIONAL: ACOGIDA");
    expect(prompt).toContain("se sienta ESCUCHADA, no examinada");
    expect(prompt).toContain("NO pidas compromisos");
    expect(prompt).toContain("NO menciones");
    expect(prompt).toContain("RESTRICCIÓN ANTI-INVENCIÓN DE MEMORIA");
  });

  it("interpelacion: activa rol completo del mentor", () => {
    const prompt = buildCoachPrompt("bloqueo", undefined, { messageCount: 30 });
    expect(prompt).toContain("FASE RELACIONAL: INTERPELACIÓN");
    expect(prompt).toContain("confianza suficiente para empujar");
  });

  it("guard anti-alucinación se inyecta en TODAS las fases", () => {
    for (const msgCount of [0, 5, 100]) {
      const prompt = buildCoachPrompt("neutral", undefined, { messageCount: msgCount });
      expect(prompt).toContain("RESTRICCIÓN ANTI-INVENCIÓN DE MEMORIA");
      expect(prompt).toContain('NUNCA referencies conversaciones pasadas');
      expect(prompt).toContain('"la última vez"');
    }
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

describe("locale reminder — el prompt TERMINA con la instrucción de idioma", () => {
  it("default (sin locale) termina con recordatorio en español", () => {
    const prompt = buildCoachPrompt("duda");
    expect(prompt.trimEnd().endsWith(
      "respondes en español.",
    )).toBe(true);
  });

  it("locale=en termina con recordatorio en inglés", () => {
    const prompt = buildCoachPrompt("duda", undefined, { locale: "en" });
    expect(prompt).toContain("FINAL NON-NEGOTIABLE REMINDER");
    expect(prompt.trimEnd().endsWith("you reply in English.")).toBe(true);
  });

  it("locale=pt termina con recordatorio en pt-PT", () => {
    const prompt = buildCoachPrompt("duda", undefined, { locale: "pt" });
    expect(prompt).toContain("LEMBRETE FINAL");
    expect(prompt.trimEnd().endsWith("respondes em português.")).toBe(true);
  });

  it("locale=fr termina con recordatorio en francés", () => {
    const prompt = buildCoachPrompt("duda", undefined, { locale: "fr" });
    expect(prompt).toContain("RAPPEL FINAL");
    expect(prompt.trimEnd().endsWith("tu réponds en français.")).toBe(true);
  });

  it("el recordatorio de idioma aparece DESPUÉS del bloque de no-repetir", () => {
    // El reminder debe ser lo último — recency effect. Verificamos que va
    // después del cierre 'Nunca respondas igual...'.
    const prompt = buildCoachPrompt("duda", undefined, { locale: "en" });
    const idxNoRepeat = prompt.indexOf("Nunca respondas igual");
    const idxReminder = prompt.indexOf("FINAL NON-NEGOTIABLE REMINDER");
    expect(idxReminder).toBeGreaterThan(idxNoRepeat);
  });
});

describe("#16 citar lo que el usuario dijo antes — regla en BASE_PROMPT", () => {
  it("el prompt incluye la instrucción de citar palabras concretas", () => {
    const prompt = buildCoachPrompt("duda");
    expect(prompt).toContain("CITA EXPLÍCITAMENTE lo que el usuario dijo");
    expect(prompt).toContain("entrecomilladas");
  });

  it("la regla prohíbe paráfrasis vagas", () => {
    const prompt = buildCoachPrompt("duda");
    expect(prompt).toContain("NO parafrasees vagamente");
    expect(prompt).toContain("lo que comentabas");
  });

  it("la regla aplica también a resúmenes de conversaciones previas", () => {
    const prompt = buildCoachPrompt("duda");
    expect(prompt).toContain("conversaciones previas");
  });
});
