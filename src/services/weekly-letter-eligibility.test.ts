const findManyMock = jest.fn();

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    user: { findMany: findManyMock },
  }),
}));

import {
  listEligibleUsers,
  shouldSendNotification,
} from "./weekly-letter-eligibility";

describe("listEligibleUsers", () => {
  const weekStart = new Date("2026-04-20T00:00:00.000Z");

  beforeEach(() => findManyMock.mockReset());

  it("aplica los filtros esperados (activo, opt-in, sin carta esta semana)", async () => {
    findManyMock.mockResolvedValue([]);
    await listEligibleUsers({ weekStart });
    expect(findManyMock).toHaveBeenCalledTimes(1);
    const args = findManyMock.mock.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.preferences.is.weeklyLetterDisabled).toBe(false);
    expect(args.where.weeklyLetters.none.weekStart).toEqual(weekStart);
  });

  it("mapea correctamente los flags de cada candidato", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "u1",
        name: "Mario",
        email: "mario@example.com",
        emailVerified: true,
        preferences: { weeklyLetterEmailDisabled: false },
      },
      {
        id: "u2",
        name: null,
        email: "anon@session.luciernaga.local",
        emailVerified: false,
        preferences: null,
      },
    ]);
    const result = await listEligibleUsers({ weekStart });
    expect(result).toEqual([
      {
        userId: "u1",
        name: "Mario",
        email: "mario@example.com",
        emailVerified: true,
        emailDisabled: false,
      },
      {
        userId: "u2",
        name: null,
        email: "anon@session.luciernaga.local",
        emailVerified: false,
        emailDisabled: false,
      },
    ]);
  });
});

describe("shouldSendNotification", () => {
  const base = {
    userId: "u1",
    name: "Mario",
    email: "mario@example.com",
    emailVerified: true,
    emailDisabled: false,
  };

  it("acepta usuario con email verificado y opt-in", () => {
    expect(shouldSendNotification(base)).toBe(true);
  });

  it("rechaza si email no está verificado", () => {
    expect(shouldSendNotification({ ...base, emailVerified: false })).toBe(false);
  });

  it("rechaza si el usuario desactivó el email de aviso", () => {
    expect(shouldSendNotification({ ...base, emailDisabled: true })).toBe(false);
  });

  it("rechaza si no hay email", () => {
    expect(shouldSendNotification({ ...base, email: null })).toBe(false);
  });

  it("rechaza el email placeholder de usuarios anónimos", () => {
    expect(shouldSendNotification({ ...base, email: "x@session.luciernaga.local" })).toBe(false);
  });
});
