const findManyMock = jest.fn();

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    message: { findMany: findManyMock },
  }),
}));

import { buildWeeklyDigest, computeWeekWindow, isDigestUsable } from "./weekly-letter-digest";

function msg(content: string, daysAgo: number, hour = 12) {
  const d = new Date(Date.UTC(2026, 3, 26, hour, 0, 0)); // Sunday 2026-04-26
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { content, createdAt: d };
}

describe("computeWeekWindow", () => {
  it("al correr un domingo devuelve la semana lunes-domingo que cubre ese domingo", () => {
    const sunday = new Date(Date.UTC(2026, 3, 26, 19, 0, 0));
    const { weekStart, weekEnd } = computeWeekWindow(sunday);
    expect(weekStart.toISOString()).toBe("2026-04-20T00:00:00.000Z");
    expect(weekEnd.toISOString()).toBe("2026-04-26T23:59:59.999Z");
  });

  it("al correr un lunes por la mañana devuelve la semana anterior a la presente", () => {
    const monday = new Date(Date.UTC(2026, 3, 27, 9, 0, 0));
    const { weekStart, weekEnd } = computeWeekWindow(monday);
    expect(weekStart.toISOString()).toBe("2026-04-27T00:00:00.000Z");
    expect(weekEnd.toISOString()).toBe("2026-05-03T23:59:59.999Z");
  });
});

describe("buildWeeklyDigest", () => {
  const reference = new Date(Date.UTC(2026, 3, 26, 19, 0, 0));

  beforeEach(() => findManyMock.mockReset());

  it("devuelve no_messages si no hay mensajes en la ventana", async () => {
    findManyMock.mockResolvedValue([]);
    const result = await buildWeeklyDigest({ userId: "u1", reference });
    expect(isDigestUsable(result)).toBe(false);
    if (!isDigestUsable(result)) expect(result.reason).toBe("no_messages");
  });

  it("devuelve below_activity_threshold con actividad en <3 días distintos", async () => {
    findManyMock.mockResolvedValue([
      msg("estoy bloqueado de nuevo esta semana", 0),
      msg("otra frase larga que también cuenta como cita válida", 0, 15),
    ]);
    const result = await buildWeeklyDigest({ userId: "u1", reference });
    expect(isDigestUsable(result)).toBe(false);
    if (!isDigestUsable(result)) expect(result.reason).toBe("below_activity_threshold");
  });

  it("devuelve no_valid_quotes si todos los mensajes son demasiado cortos o sensibles", async () => {
    findManyMock.mockResolvedValue([
      msg("ok", 0),
      msg("si", 1),
      msg("escríbeme a foo@bar.com porfa", 2),
      msg("https://example.com", 3),
      msg("1234567812345678", 4),
    ]);
    const result = await buildWeeklyDigest({ userId: "u1", reference });
    expect(isDigestUsable(result)).toBe(false);
    if (!isDigestUsable(result)) expect(result.reason).toBe("no_valid_quotes");
  });

  it("devuelve digest válido con 3 citas cuando la actividad y la longitud son suficientes", async () => {
    findManyMock.mockResolvedValue([
      msg("me siento bloqueado y no consigo avanzar con el proyecto", 1),
      msg("hoy intenté otra vez pero me quedé mirando la pantalla sin saber por dónde empezar", 3),
      msg("estoy agotado y siento que no avanzo hacia nada concreto", 5),
      msg("otra frase corta pero quotable como cita de la semana", 6),
    ]);
    const result = await buildWeeklyDigest({ userId: "u1", reference });
    expect(isDigestUsable(result)).toBe(true);
    if (isDigestUsable(result)) {
      expect(result.quotes).toHaveLength(3);
      expect(result.daysActive).toBe(4);
      expect(result.dominantState).toBe("bloqueo");
    }
  });

  it("no repite citas idénticas aunque aparezcan varias veces", async () => {
    const repeated = "me siento bloqueado y no consigo avanzar hoy tampoco";
    findManyMock.mockResolvedValue([
      msg(repeated, 1),
      msg(repeated, 2),
      msg(repeated, 3),
    ]);
    const result = await buildWeeklyDigest({ userId: "u1", reference });
    expect(isDigestUsable(result)).toBe(true);
    if (isDigestUsable(result)) {
      expect(result.quotes).toHaveLength(1);
    }
  });

  it("filtra mensajes con URLs, emails o cadenas largas de dígitos", async () => {
    findManyMock.mockResolvedValue([
      msg("hoy ha sido un día difícil y me siento cansado de verdad", 1),
      msg("revisa esto en https://ejemplo.com/algo muy importante hoy", 2),
      msg("mi tarjeta es 4111111111111111 ya lo sé", 3),
    ]);
    const result = await buildWeeklyDigest({ userId: "u1", reference });
    expect(isDigestUsable(result)).toBe(true);
    if (isDigestUsable(result)) {
      expect(result.quotes).toHaveLength(1);
      expect(result.quotes[0]).toBe("hoy ha sido un día difícil y me siento cansado de verdad");
    }
  });
});
