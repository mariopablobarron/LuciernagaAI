const resolveIdentityMock = jest.fn();

jest.mock("@/lib/auth", () => ({
  attachSessionCookie: jest.fn(),
  InvalidSessionTokenError: class InvalidSessionTokenError extends Error {
    constructor() {
      super("INVALID_SESSION_TOKEN");
      this.name = "InvalidSessionTokenError";
    }
  },
  issueSessionToken: jest.fn(() => "session-token"),
  resolveIdentity: (...args: unknown[]) => resolveIdentityMock(...args),
}));

jest.mock("@/lib/password", () => ({
  hashPassword: jest.fn(async () => "hashed-new-password"),
  verifyPassword: jest.fn(async () => false),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("@/services/welcomeAvatarVideo", () => ({
  triggerWelcomeAvatarVideoAsync: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock("@/lib/alerts", () => ({ sendAlert: jest.fn() }));

import { attachSessionCookie, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { NextRequest } from "next/server";
import { POST } from "./route";

const getPrismaClientMock = jest.mocked(getPrismaClient);
const attachSessionCookieMock = jest.mocked(attachSessionCookie);
const hashPasswordMock = jest.mocked(hashPassword);
const verifyPasswordMock = jest.mocked(verifyPassword);
const classroomCodeFindUniqueMock = jest.fn();
const classroomCodeUpdateMock = jest.fn();
const userCountMock = jest.fn();
const userFindUniqueMock = jest.fn();
const userUpdateMock = jest.fn();
const userCreateMock = jest.fn();
const transactionMock = jest.fn(async (operations: Array<Promise<unknown>>) =>
  Promise.all(operations)
);

const classroomCode = {
  id: "code_1",
  code: "CLASS-2026",
  isActive: true,
  expiresAt: null,
  maxUses: 20,
  usedCount: 0,
  classroom: {
    id: "class_1",
    name: "Clase 1",
    organizationId: "org_1",
    isActive: true,
    organization: {
      id: "org_1",
      name: "Organización 1",
      isActive: true,
      maxUsers: 100,
    },
  },
};

function makeRequest(email = "victim@example.com") {
  return new NextRequest("http://localhost/api/auth/register-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "CLASS-2026",
      email,
      password: "password1234",
      name: "User",
    }),
  });
}

describe("POST /api/auth/register-code — existing account ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveIdentityMock.mockReset();
    resolveIdentityMock.mockRejectedValue(new InvalidSessionTokenError());
    classroomCodeFindUniqueMock.mockResolvedValue(classroomCode);
    classroomCodeUpdateMock.mockResolvedValue({});
    userCountMock.mockResolvedValue(0);
    userUpdateMock.mockResolvedValue({});
    userCreateMock.mockResolvedValue({ id: "usr_new" });
    transactionMock.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    );
    getPrismaClientMock.mockReturnValue({
      classroomCode: {
        findUnique: classroomCodeFindUniqueMock,
        update: classroomCodeUpdateMock,
      },
      user: {
        count: userCountMock,
        findUnique: userFindUniqueMock,
        update: userUpdateMock,
        create: userCreateMock,
      },
      $transaction: transactionMock,
    } as never);
  });

  it("rechaza una cuenta passwordless ajena aunque el código de aula sea válido", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "usr_victim",
      email: "victim@example.com",
      passwordHash: null,
      organizationId: null,
    });
    resolveIdentityMock.mockResolvedValueOnce({ userId: "usr_attacker" });

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "INVALID_CREDENTIALS",
      message: "No se pudo verificar la cuenta existente.",
    });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(attachSessionCookieMock).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña incorrecta de una cuenta existente", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "usr_victim",
      email: "victim@example.com",
      passwordHash: "stored-hash",
      organizationId: null,
    });
    verifyPasswordMock.mockResolvedValueOnce(false);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(attachSessionCookieMock).not.toHaveBeenCalled();
  });

  it("mantiene el alta de una cuenta existente cuando la contraseña es correcta", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "usr_owner",
      email: "owner@example.com",
      passwordHash: "stored-hash",
      organizationId: null,
    });
    verifyPasswordMock.mockResolvedValueOnce(true);

    const response = await POST(makeRequest("owner@example.com"));

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "usr_owner" },
      data: {
        passwordHash: "stored-hash",
        organizationId: "org_1",
        classroomId: "class_1",
      },
    });
    expect(attachSessionCookieMock).toHaveBeenCalledTimes(1);
  });

  it("mantiene el upgrade passwordless para la sesión propietaria y fija contraseña", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "usr_owner",
      email: "owner@example.com",
      passwordHash: null,
      organizationId: null,
    });
    resolveIdentityMock.mockResolvedValueOnce({ userId: "usr_owner" });
    hashPasswordMock.mockResolvedValueOnce("hashed-new-password");

    const response = await POST(makeRequest("owner@example.com"));

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "usr_owner" },
      data: {
        passwordHash: "hashed-new-password",
        organizationId: "org_1",
        classroomId: "class_1",
      },
    });
    expect(attachSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});
