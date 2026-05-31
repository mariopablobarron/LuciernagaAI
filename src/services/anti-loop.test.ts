import {
  userProtestedRepetition,
  userRejectedFlow,
  recentActionLockCount,
  recentEmailPromptCount,
  recentCrisisActivity,
  shouldSilenceAdminLoops,
} from "./anti-loop";

describe("userProtestedRepetition — detecta súplicas reales del usuario", () => {
  test("Casos REALES de la auditoría 2026-05-25 (convo cmpc71rz)", () => {
    // Lo que dijo la madre en la convo real:
    expect(userProtestedRepetition("Deja de pedirme el email")).toBe(true);
    expect(userProtestedRepetition("Deja ya de pedirme el email. Ya te lo he pasado")).toBe(true);
    expect(userProtestedRepetition("Deja de preguntarme el email")).toBe(true);
    expect(userProtestedRepetition("Echa de pasar el email por favor. Continuemos. Deja de preguntarme eso")).toBe(true);
    expect(userProtestedRepetition("no me has dado ideas")).toBe(true);
    expect(userProtestedRepetition("deja de preguntar por el email. No me has dado ideas")).toBe(true);
  });

  test("Variantes en otros idiomas", () => {
    expect(userProtestedRepetition("Stop asking me that")).toBe(true);
    expect(userProtestedRepetition("you are repeating yourself")).toBe(true);
    expect(userProtestedRepetition("para de perguntar")).toBe(true);
    expect(userProtestedRepetition("arrête de demander")).toBe(true);
  });

  test("NO falsos positivos en mensajes normales", () => {
    expect(userProtestedRepetition("Necesito tomar una decisión importante")).toBe(false);
    expect(userProtestedRepetition("Sí")).toBe(false);
    expect(userProtestedRepetition("Ya he probado eso pero no funciona en mi caso")).toBe(false);
    expect(userProtestedRepetition("")).toBe(false);
    expect(userProtestedRepetition("no")).toBe(false);
  });
});

describe("recentActionLockCount — cuenta cuántos action locks ya hubo", () => {
  test("0 si no hay mensajes", () => {
    expect(recentActionLockCount([])).toBe(0);
    expect(recentActionLockCount(null)).toBe(0);
  });

  test("Cuenta los exactos patrones del bucle real", () => {
    const messages = [
      { role: "user", content: "no" },
      { role: "assistant", content: "Hay algo de antes que seguimos sin cerrar: «X». ¿Qué prefieres — ya lo hiciste, lo retomas ahora, lo aparcas para más tarde, o lo cerramos?" },
      { role: "user", content: "no" },
      { role: "assistant", content: "Dejamos «Y» a medias. ¿Ya lo hiciste, lo retomas hoy, lo aparcas, o lo cerramos?" },
      { role: "user", content: "no" },
      { role: "assistant", content: "Quedó abierto «Z». Dime si ya lo hiciste, si lo retomas, si lo aparcas para luego o si lo cerramos." },
    ];
    expect(recentActionLockCount(messages, 3)).toBe(3);
  });

  test("No cuenta respuestas normales del asistente", () => {
    const messages = [
      { role: "assistant", content: "Tiene sentido lo que dices. ¿Qué llevas evitando?" },
      { role: "assistant", content: "Eso es importante. Dame un paso concreto." },
    ];
    expect(recentActionLockCount(messages, 3)).toBe(0);
  });
});

describe("recentEmailPromptCount — cuenta peticiones de email recientes", () => {
  test("Detecta el patrón exacto del CAPTURE_EMAIL_PROMPT", () => {
    const messages = [
      { role: "assistant", content: "Cosa A.\n\nSi quieres retomar esto otro día justo donde lo dejamos, déjame tu email y te lo guardo." },
      { role: "user", content: "no" },
      { role: "assistant", content: "Cosa B.\n\nSi quieres retomar esto otro día justo donde lo dejamos, déjame tu email y te lo guardo." },
    ];
    expect(recentEmailPromptCount(messages, 3)).toBe(2);
  });
});

describe("recentCrisisActivity — bypass total tras crisis", () => {
  test("Disparo por mensaje del usuario", () => {
    const messages = [
      { role: "user", content: "estoy cansada de vivir" },
      { role: "assistant", content: "respuesta" },
    ];
    expect(recentCrisisActivity(messages)).toBe(true);
  });

  test("Disparo si el mentor ya invocó el 024", () => {
    const messages = [
      { role: "assistant", content: "Llama ahora al 024. Es gratuito y confidencial." },
    ];
    expect(recentCrisisActivity(messages)).toBe(true);
  });

  test("NO falso positivo con conversación normal", () => {
    const messages = [
      { role: "user", content: "estoy cansada del trabajo" },
      { role: "assistant", content: "tiene sentido" },
    ];
    expect(recentCrisisActivity(messages)).toBe(false);
  });
});

describe("shouldSilenceAdminLoops — decisión final integrada", () => {
  test("Crisis reciente silencia TODO", () => {
    const r = shouldSilenceAdminLoops({
      currentUserMessage: "no",
      recentMessages: [
        { role: "user", content: "estoy cansada de vivir" },
      ],
    });
    expect(r.silenceActionLock).toBe(true);
    expect(r.silenceEmailPrompt).toBe(true);
    expect(r.reason).toBe("crisis");
  });

  test("Protesta del usuario silencia TODO", () => {
    const r = shouldSilenceAdminLoops({
      currentUserMessage: "Deja de pedirme el email",
      recentMessages: [],
    });
    expect(r.silenceActionLock).toBe(true);
    expect(r.silenceEmailPrompt).toBe(true);
    expect(r.reason).toBe("protest");
  });

  test("3 action locks seguidos → silencia solo action lock", () => {
    const recent = [
      { role: "assistant", content: "Hay algo de antes que seguimos sin cerrar: X" },
      { role: "user", content: "vale" },
      { role: "assistant", content: "Hay algo de antes que seguimos sin cerrar: X" },
      { role: "user", content: "vale" },
      { role: "assistant", content: "Hay algo de antes que seguimos sin cerrar: X" },
    ];
    const r = shouldSilenceAdminLoops({ currentUserMessage: "vale", recentMessages: recent });
    expect(r.silenceActionLock).toBe(true);
    expect(r.reason).toBe("repeated_action_lock");
  });

  test("Conversación normal — no silencia nada", () => {
    const r = shouldSilenceAdminLoops({
      currentUserMessage: "vale, entiendo",
      recentMessages: [{ role: "assistant", content: "tiene sentido" }],
    });
    expect(r.silenceActionLock).toBe(false);
    expect(r.silenceEmailPrompt).toBe(false);
    expect(r.reason).toBe(null);
  });
});

// ─── Iteración 2026-05-26 — fixes tras observar conv cmpmww8tr ────────────────

describe("userProtestedRepetition — confusión suave (añadida 26-05-2026)", () => {
  test("ES — 'no te entiendo' (caso real conv cmpmww8tr)", () => {
    expect(userProtestedRepetition("No te entiendo")).toBe(true);
    expect(userProtestedRepetition("no entiendo")).toBe(true);
    expect(userProtestedRepetition("no comprendo")).toBe(true);
    expect(userProtestedRepetition("no te sigo")).toBe(true);
    expect(userProtestedRepetition("no sé qué quieres")).toBe(true);
    expect(userProtestedRepetition("no sé de qué hablas")).toBe(true);
    expect(userProtestedRepetition("qué dices?")).toBe(true);
    expect(userProtestedRepetition("qué quieres decir")).toBe(true);
  });

  test("EN — confusión suave", () => {
    expect(userProtestedRepetition("I don't understand")).toBe(true);
    expect(userProtestedRepetition("I don't get it")).toBe(true);
    expect(userProtestedRepetition("what do you mean")).toBe(true);
    expect(userProtestedRepetition("what are you talking about")).toBe(true);
  });

  test("PT — confusão", () => {
    expect(userProtestedRepetition("não entendo")).toBe(true);
    expect(userProtestedRepetition("não te percebo")).toBe(true);
  });

  test("FR — confusion", () => {
    expect(userProtestedRepetition("je ne comprends pas")).toBe(true);
    expect(userProtestedRepetition("je ne te suis pas")).toBe(true);
  });

  test("Sigue sin falso positivo con 'no' aislado (es flow_rejection, no protesta)", () => {
    expect(userProtestedRepetition("no")).toBe(false);
    expect(userProtestedRepetition("No.")).toBe(false);
  });
});

describe("userRejectedFlow — rechazo corto del flujo (añadida 26-05-2026)", () => {
  test("ES — 'No' aislado (caso real conv cmpmww8tr)", () => {
    expect(userRejectedFlow("No")).toBe(true);
    expect(userRejectedFlow("no")).toBe(true);
    expect(userRejectedFlow("No.")).toBe(true);
    expect(userRejectedFlow("no quiero")).toBe(true);
    expect(userRejectedFlow("déjalo")).toBe(true);
    expect(userRejectedFlow("olvídalo")).toBe(true);
  });

  test("Multilingüe", () => {
    expect(userRejectedFlow("Nope")).toBe(true);
    expect(userRejectedFlow("Não")).toBe(true);
    expect(userRejectedFlow("Non")).toBe(true);
    expect(userRejectedFlow("drop it")).toBe(true);
    expect(userRejectedFlow("laisse tomber")).toBe(true);
  });

  test("NO falso positivo con frases con 'no' dentro", () => {
    expect(userRejectedFlow("no me siento bien")).toBe(false);
    expect(userRejectedFlow("creo que no es buena idea")).toBe(false);
    expect(userRejectedFlow("no sé qué hacer")).toBe(false);
  });
});

describe("shouldSilenceAdminLoops — umbral nuevo y flow_rejection", () => {
  test("1 action lock previo SÍ silencia (umbral bajado de 2 a 1)", () => {
    const recent = [
      { role: "assistant", content: "Hay algo de antes que seguimos sin cerrar: X" },
      { role: "user", content: "vale" },
    ];
    const r = shouldSilenceAdminLoops({ currentUserMessage: "vale", recentMessages: recent });
    expect(r.silenceActionLock).toBe(true);
    expect(r.reason).toBe("repeated_action_lock");
  });

  test("Confusión suave del usuario silencia action lock (caso real cmpmww8tr T5)", () => {
    const r = shouldSilenceAdminLoops({
      currentUserMessage: "No te entiendo",
      recentMessages: [
        { role: "assistant", content: "Hay algo de antes que seguimos sin cerrar: X" },
      ],
    });
    expect(r.silenceActionLock).toBe(true);
    expect(r.reason).toBe("protest");
  });

  test("'No' aislado dispara flow_rejection (NO action lock)", () => {
    const r = shouldSilenceAdminLoops({
      currentUserMessage: "No",
      recentMessages: [{ role: "assistant", content: "¿qué llevas evitando?" }],
    });
    expect(r.silenceActionLock).toBe(true);
    expect(r.silenceEmailPrompt).toBe(false); // email NO se pausa por flow_rejection
    expect(r.reason).toBe("flow_rejection");
  });
});
