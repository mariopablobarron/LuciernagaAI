const capsuleFindFirstMock = jest.fn();
const capsuleCreateMock = jest.fn();
const capsuleFindManyMock = jest.fn();
const capsuleUpdateMock = jest.fn();
const messageCountMock = jest.fn();
const messageFindManyMock = jest.fn();
const heartbeatCountMock = jest.fn();
const userStateFindUniqueMock = jest.fn();
const goalFindFirstMock = jest.fn();

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    capsule: {
      findFirst: capsuleFindFirstMock,
      findMany: capsuleFindManyMock,
      create: capsuleCreateMock,
      update: capsuleUpdateMock,
    },
    message: { count: messageCountMock, findMany: messageFindManyMock },
    heartbeat: { count: heartbeatCountMock },
    userState: { findUnique: userStateFindUniqueMock },
    goal: { findFirst: goalFindFirstMock },
  }),
}));

import {
  CAPSULE_LIMITS,
  CapsuleAccessError,
  InvalidLetterError,
  createLetterForUser,
  createSnapshotForUser,
  listCapsulesForUser,
  openCapsule,
} from "./capsules";

beforeEach(() => {
  capsuleFindFirstMock.mockReset();
  capsuleCreateMock.mockReset();
  capsuleFindManyMock.mockReset();
  capsuleUpdateMock.mockReset();
  messageCountMock.mockReset();
  messageFindManyMock.mockReset();
  heartbeatCountMock.mockReset();
  userStateFindUniqueMock.mockReset();
  goalFindFirstMock.mockReset();
});

describe("createSnapshotForUser", () => {
  const NOW = new Date("2026-04-25T10:00:00.000Z");

  function setupQueriesEmpty() {
    messageCountMock.mockResolvedValue(0);
    heartbeatCountMock.mockResolvedValue(0);
    userStateFindUniqueMock.mockResolvedValue(null);
    goalFindFirstMock.mockResolvedValue(null);
    messageFindManyMock.mockResolvedValue([]);
  }

  it("no crea si ya hay snapshot creado hoy (idempotencia diaria)", async () => {
    capsuleFindFirstMock.mockResolvedValue({ id: "existing" });
    const result = await createSnapshotForUser("u1", { now: NOW });
    expect(result).toBeNull();
    expect(capsuleCreateMock).not.toHaveBeenCalled();
  });

  it("genera snapshot con deliverAt = ahora + windowDays", async () => {
    capsuleFindFirstMock.mockResolvedValue(null);
    setupQueriesEmpty();
    capsuleCreateMock.mockResolvedValue({ id: "cap1" });

    const result = await createSnapshotForUser("u1", { now: NOW, windowDays: 30 });

    expect(result).toEqual({ id: "cap1" });
    const args = capsuleCreateMock.mock.calls[0][0];
    expect(args.data.userId).toBe("u1");
    expect(args.data.kind).toBe("snapshot");
    expect(args.data.status).toBe("pending");
    expect(args.data.deliverAt.getTime()).toBe(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(args.data.payload.kind).toBe("snapshot");
    expect(args.data.payload.windowDays).toBe(30);
  });

  it("incluye stats agregadas y trunca snippets a 140 chars", async () => {
    capsuleFindFirstMock.mockResolvedValue(null);
    messageCountMock.mockResolvedValue(47);
    heartbeatCountMock.mockResolvedValue(12);
    userStateFindUniqueMock.mockResolvedValue({ state: "duda" });
    goalFindFirstMock.mockResolvedValue({
      title: "Hablar con mi hermana",
      actions: [{ completed: true }, { completed: false }, { completed: false }],
    });
    const longText = "a".repeat(200);
    messageFindManyMock.mockResolvedValue([
      { createdAt: new Date("2026-04-24T08:00:00.000Z"), content: longText },
    ]);
    capsuleCreateMock.mockResolvedValue({ id: "cap2" });

    await createSnapshotForUser("u1", { now: NOW });

    const payload = capsuleCreateMock.mock.calls[0][0].data.payload;
    expect(payload.stats.messagesSent).toBe(47);
    expect(payload.stats.heartbeats).toBe(12);
    expect(payload.stats.dominantState).toBe("duda");
    expect(payload.stats.activeGoalTitle).toBe("Hablar con mi hermana");
    expect(payload.stats.activeGoalProgress).toBe(33); // 1 de 3 completados
    expect(payload.snippets[0].preview).toHaveLength(140);
  });
});

describe("createLetterForUser", () => {
  const NOW = new Date("2026-04-25T10:00:00.000Z");

  it("rechaza texto vacío", async () => {
    await expect(
      createLetterForUser("u1", "   ", new Date(NOW.getTime() + 30 * 86400000), { now: NOW }),
    ).rejects.toThrow(InvalidLetterError);
  });

  it("rechaza texto excesivo", async () => {
    const tooLong = "x".repeat(CAPSULE_LIMITS.LETTER_MAX_CHARS + 1);
    await expect(
      createLetterForUser("u1", tooLong, new Date(NOW.getTime() + 30 * 86400000), { now: NOW }),
    ).rejects.toThrow(InvalidLetterError);
  });

  it("rechaza deliverAt fuera de ventana [+7d, +365d]", async () => {
    const tooSoon = new Date(NOW.getTime() + 3 * 86400000);
    await expect(
      createLetterForUser("u1", "hola yo del futuro", tooSoon, { now: NOW }),
    ).rejects.toThrow(InvalidLetterError);

    const tooLate = new Date(NOW.getTime() + 400 * 86400000);
    await expect(
      createLetterForUser("u1", "hola yo del futuro", tooLate, { now: NOW }),
    ).rejects.toThrow(InvalidLetterError);
  });

  it("crea con texto trimmed y payload kind=letter", async () => {
    capsuleCreateMock.mockResolvedValue({ id: "cap3" });
    const deliverAt = new Date(NOW.getTime() + 60 * 86400000);
    const result = await createLetterForUser("u1", "  hola yo del futuro  ", deliverAt, { now: NOW });

    expect(result).toEqual({ id: "cap3" });
    const args = capsuleCreateMock.mock.calls[0][0];
    expect(args.data.kind).toBe("letter");
    expect(args.data.payload.text).toBe("hola yo del futuro");
    expect(args.data.deliverAt).toEqual(deliverAt);
  });
});

describe("listCapsulesForUser", () => {
  it("excluye expiradas y pide ordenadas por deliverAt asc", async () => {
    capsuleFindManyMock.mockResolvedValue([]);
    await listCapsulesForUser("u1");
    const args = capsuleFindManyMock.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1", status: { not: "expired" } });
    expect(args.orderBy).toEqual({ deliverAt: "asc" });
  });
});

describe("openCapsule", () => {
  const NOW = new Date("2026-04-25T10:00:00.000Z");

  it("lanza NOT_FOUND si no existe o no es del usuario", async () => {
    capsuleFindFirstMock.mockResolvedValue(null);
    await expect(openCapsule("u1", "missing", { now: NOW })).rejects.toThrow(CapsuleAccessError);
  });

  it("lanza NOT_READY si deliverAt en el futuro", async () => {
    capsuleFindFirstMock.mockResolvedValue({
      id: "c1",
      kind: "letter",
      status: "pending",
      createdAt: NOW,
      deliverAt: new Date(NOW.getTime() + 86400000),
      deliveredAt: null,
      openedAt: null,
      payload: { kind: "letter", createdAt: NOW.toISOString(), text: "hola" },
    });
    await expect(openCapsule("u1", "c1", { now: NOW })).rejects.toThrow(CapsuleAccessError);
    expect(capsuleUpdateMock).not.toHaveBeenCalled();
  });

  it("marca delivered y openedAt en primera apertura", async () => {
    capsuleFindFirstMock.mockResolvedValue({
      id: "c1",
      kind: "letter",
      status: "ready",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      deliverAt: new Date("2026-04-01T00:00:00.000Z"),
      deliveredAt: null,
      openedAt: null,
      payload: { kind: "letter", createdAt: "2026-01-01T00:00:00.000Z", text: "hola" },
    });
    capsuleUpdateMock.mockResolvedValue({});

    const result = await openCapsule("u1", "c1", { now: NOW });

    expect(capsuleUpdateMock).toHaveBeenCalledTimes(1);
    const args = capsuleUpdateMock.mock.calls[0][0];
    expect(args.data.status).toBe("delivered");
    expect(args.data.openedAt).toEqual(NOW);
    expect(result.payload.kind).toBe("letter");
  });

  it("no re-marca delivered si ya estaba abierta", async () => {
    capsuleFindFirstMock.mockResolvedValue({
      id: "c1",
      kind: "snapshot",
      status: "delivered",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      deliverAt: new Date("2026-04-01T00:00:00.000Z"),
      deliveredAt: new Date("2026-04-02T00:00:00.000Z"),
      openedAt: new Date("2026-04-02T00:00:00.000Z"),
      payload: { kind: "snapshot", windowDays: 30, createdAt: "2026-01-01T00:00:00.000Z", stats: {}, snippets: [] },
    });

    const result = await openCapsule("u1", "c1", { now: NOW });
    expect(capsuleUpdateMock).not.toHaveBeenCalled();
    expect(result.summary.id).toBe("c1");
  });
});
