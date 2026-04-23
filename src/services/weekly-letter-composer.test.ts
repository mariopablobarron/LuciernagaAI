jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

import {
  composeWeeklyLetter,
  InsufficientMaterialError,
  QuoteNotGroundedError,
  WEEKLY_LETTER_SUBJECT,
} from "./weekly-letter-composer";
import type { WeeklyLetterDigest } from "./weekly-letter-digest";

function digest(overrides: Partial<WeeklyLetterDigest> = {}): WeeklyLetterDigest {
  return {
    userId: "u1",
    weekStart: new Date("2026-04-20T00:00:00.000Z"),
    weekEnd: new Date("2026-04-26T23:59:59.999Z"),
    quotes: ["me siento bloqueado y no consigo avanzar"],
    dominantState: "bloqueo",
    daysActive: 4,
    messageCount: 12,
    ...overrides,
  };
}

describe("composeWeeklyLetter", () => {
  it("devuelve carta válida cuando el LLM cita textualmente al usuario", async () => {
    const callLLM = jest.fn().mockResolvedValue(
      `Esta semana dijiste "me siento bloqueado y no consigo avanzar". Y lo que es peor, llevas varios días sin cambiar la forma de intentarlo. ¿Qué cambiarás mañana para que el lunes no vuelvas a la misma escena?`
    );
    const letter = await composeWeeklyLetter(digest(), { callLLM });
    expect(letter.subject).toBe(WEEKLY_LETTER_SUBJECT);
    expect(letter.body).toContain("me siento bloqueado y no consigo avanzar");
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it("tira InsufficientMaterialError si el LLM responde NO_MATERIAL", async () => {
    const callLLM = jest.fn().mockResolvedValue("NO_MATERIAL");
    await expect(composeWeeklyLetter(digest(), { callLLM })).rejects.toBeInstanceOf(
      InsufficientMaterialError,
    );
  });

  it("reintenta una vez si la primera respuesta no cita al usuario", async () => {
    const callLLM = jest
      .fn()
      .mockResolvedValueOnce("Una carta genérica sin cita ninguna. ¿Qué harás?")
      .mockResolvedValueOnce(
        `Lo que escribiste: "me siento bloqueado y no consigo avanzar". Mírate. ¿Dónde está el primer paso?`,
      );
    const letter = await composeWeeklyLetter(digest(), { callLLM });
    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(letter.body).toContain("me siento bloqueado");
  });

  it("tras 2 intentos sin cita textual, tira QuoteNotGroundedError", async () => {
    const callLLM = jest.fn().mockResolvedValue("Carta genérica sin cita. ¿Qué harás?");
    await expect(composeWeeklyLetter(digest(), { callLLM })).rejects.toBeInstanceOf(
      QuoteNotGroundedError,
    );
    expect(callLLM).toHaveBeenCalledTimes(2);
  });

  it("recorta el cuerpo si excede 200 palabras", async () => {
    const quote = "me siento bloqueado y no consigo avanzar";
    const longBody = `${quote} ${"palabra ".repeat(300)}¿Y ahora qué?`;
    const callLLM = jest.fn().mockResolvedValue(longBody);
    const letter = await composeWeeklyLetter(digest(), { callLLM });
    const words = letter.body.trim().split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(200);
  });
});
