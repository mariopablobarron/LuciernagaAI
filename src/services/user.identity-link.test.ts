jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  cache: {
    invalidate: jest.fn(),
  },
}));

import { IdentityLinkConflictError, linkIdentityToEmail } from "./user";

const getPrismaClientMock = jest.requireMock("@/db/prisma").getPrismaClient as jest.Mock;
const cacheInvalidateMock = jest.requireMock("@/lib/cache").cache.invalidate as jest.Mock;
const userFindUniqueMock = jest.fn();
const userCreateMock = jest.fn();
const userUpdateMock = jest.fn();
const userDeleteMock = jest.fn();

describe("linkIdentityToEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrismaClientMock.mockReturnValue({
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: {
            findUnique: userFindUniqueMock,
            create: userCreateMock,
            update: userUpdateMock,
            delete: userDeleteMock,
          },
        }),
    });
  });

  it("no entrega una cuenta existente a una sesión anónima que conoce su email", async () => {
    userFindUniqueMock
      .mockResolvedValueOnce({
        id: "usr_attacker",
        email: "usr_attacker@session.latidos.local",
        name: null,
        lastSeen: new Date("2026-08-22T00:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        id: "usr_victim",
        email: "victim@example.com",
        name: "Victim",
        lastSeen: new Date("2026-08-21T00:00:00.000Z"),
      });

    await expect(
      linkIdentityToEmail({
        currentUserId: "usr_attacker",
        email: "Victim@Example.com",
      })
    ).rejects.toBeInstanceOf(IdentityLinkConflictError);

    expect(userFindUniqueMock).toHaveBeenLastCalledWith({
      where: { email: "victim@example.com" },
    });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(userDeleteMock).not.toHaveBeenCalled();
    expect(cacheInvalidateMock).not.toHaveBeenCalled();
  });

  it("mantiene la captura legítima cuando el email todavía está libre", async () => {
    userFindUniqueMock
      .mockResolvedValueOnce({
        id: "usr_new",
        email: "usr_new@session.latidos.local",
        name: null,
        lastSeen: new Date("2026-08-22T00:00:00.000Z"),
      })
      .mockResolvedValueOnce(null);
    userUpdateMock.mockResolvedValueOnce({ id: "usr_new" });

    await expect(
      linkIdentityToEmail({
        currentUserId: "usr_new",
        email: "new@example.com",
        name: "New User",
      })
    ).resolves.toEqual({ userId: "usr_new" });

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "usr_new" },
      data: expect.objectContaining({
        email: "new@example.com",
        name: "New User",
      }),
    });
    expect(userDeleteMock).not.toHaveBeenCalled();
  });

  it("permite actualizar la misma identidad cuando ya posee ese email", async () => {
    const currentUser = {
      id: "usr_owner",
      email: "owner@example.com",
      name: "Owner",
      lastSeen: new Date("2026-08-22T00:00:00.000Z"),
    };
    userFindUniqueMock.mockResolvedValueOnce(currentUser).mockResolvedValueOnce(currentUser);
    userUpdateMock.mockResolvedValueOnce({ id: "usr_owner" });

    await expect(
      linkIdentityToEmail({
        currentUserId: "usr_owner",
        email: "OWNER@example.com",
        name: "Updated Owner",
      })
    ).resolves.toEqual({ userId: "usr_owner" });

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "usr_owner" },
      data: expect.objectContaining({
        email: "owner@example.com",
        name: "Updated Owner",
      }),
    });
    expect(userDeleteMock).not.toHaveBeenCalled();
  });
});
