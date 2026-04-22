const findManyMock = jest.fn();

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    message: { findMany: findManyMock },
  }),
}));

import { detectRecurrentState } from "./blocker-recurrence";

function msg(content: string, daysAgo: number, hour = 12) {
  const d = new Date(Date.UTC(2026, 3, 23, hour, 0, 0));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { content, createdAt: d };
}

describe("detectRecurrentState", () => {
  const now = new Date(Date.UTC(2026, 3, 23, 12, 0, 0));

  beforeEach(() => findManyMock.mockReset());

  it("devuelve isRecurrent:false cuando no hay mensajes", async () => {
    findManyMock.mockResolvedValue([]);
    const result = await detectRecurrentState("u1", { now });
    expect(result).toEqual({ isRecurrent: false });
  });

  it("no dispara con un solo día que cumple", async () => {
    findManyMock.mockResolvedValue([
      msg("estoy bloqueado total", 0, 9),
      msg("otro bloqueo, no avanzo", 0, 15),
    ]);
    const result = await detectRecurrentState("u1", { now });
    expect(result).toEqual({ isRecurrent: false });
  });

  it("dispara con bloqueo en 2 días distintos en ventana 7d", async () => {
    findManyMock.mockResolvedValue([
      msg("me siento bloqueado", 1),
      msg("otro bloqueo, no avanzo", 3),
      msg("hoy fue un buen día", 0),
    ]);
    const result = await detectRecurrentState("u1", { now });
    expect(result).toEqual({ isRecurrent: true, state: "bloqueo", daysHit: 2 });
  });

  it("no dispara con bloqueo fuera de la ventana de 7 días", async () => {
    findManyMock.mockResolvedValue([
      msg("me siento bloqueado", 1),
      msg("bloqueado total", 10),
    ]);
    const result = await detectRecurrentState("u1", { now });
    expect(result).toEqual({ isRecurrent: false });
  });

  it("prioriza bloqueo sobre ansiedad cuando ambos cumplen", async () => {
    findManyMock.mockResolvedValue([
      msg("tengo ansiedad", 1),
      msg("mucha ansiedad hoy", 2),
      msg("estoy bloqueado", 3),
      msg("otro día bloqueado", 4),
    ]);
    const result = await detectRecurrentState("u1", { now });
    expect(result.isRecurrent).toBe(true);
    if (result.isRecurrent) expect(result.state).toBe("bloqueo");
  });

  it("respeta umbral y ventana personalizados", async () => {
    findManyMock.mockResolvedValue([
      msg("bloqueado", 1),
      msg("me siento bloqueado", 3),
      msg("otro día bloqueado", 5),
    ]);
    const result = await detectRecurrentState("u1", {
      now,
      minDaysHit: 3,
      windowDays: 14,
    });
    expect(result).toEqual({ isRecurrent: true, state: "bloqueo", daysHit: 3 });
  });

  it("no dispara si los estados objetivo no se alcanzan", async () => {
    findManyMock.mockResolvedValue([
      msg("hoy fue un buen día", 1),
      msg("tengo claridad sobre mi plan", 3),
    ]);
    const result = await detectRecurrentState("u1", { now });
    expect(result).toEqual({ isRecurrent: false });
  });
});
