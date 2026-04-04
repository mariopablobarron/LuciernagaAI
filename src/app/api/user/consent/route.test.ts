jest.mock("@/lib/auth", () => ({
  attachSessionCookie: jest.fn((response: Response) => response),
  clearSessionCookie: jest.fn((response: Response) => response),
  InvalidSessionTokenError: class InvalidSessionTokenError extends Error {
    constructor() {
      super("Invalid or expired session token");
      this.name = "InvalidSessionTokenError";
    }
  },
  resolveIdentity: jest.fn(),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";

describe("POST /api/user/consent", () => {
  const findUnique = jest.fn();
  const update = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getPrismaClient as jest.Mock).mockReturnValue({
      user: {
        findUnique,
        update,
      },
    });
  });

  it("persiste consentimiento y setea cookie si la identidad lo requiere", async () => {
    const consentAt = new Date("2026-04-04T10:00:00.000Z");

    (resolveIdentity as jest.Mock).mockResolvedValue({
      userId: "usr_consent_1",
      sessionToken: "session-token",
      shouldSetCookie: true,
      source: "generated",
    });
    findUnique.mockResolvedValue({
      consentGiven: false,
      consentAt,
      source: null,
    });
    update.mockResolvedValue({ id: "usr_consent_1" });

    const req = new NextRequest("http://localhost/api/user/consent", {
      method: "POST",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.consentGiven).toBe(true);
    expect(body.consentAt).toBe(consentAt.toISOString());
    expect(update).toHaveBeenCalledWith({
      where: { id: "usr_consent_1" },
      data: {
        consentGiven: true,
        consentAt,
        source: "web",
      },
    });
    expect(attachSessionCookie).toHaveBeenCalledWith(response, "session-token");
  });

  it("devuelve 401 y limpia cookie si la sesión es inválida", async () => {
    (resolveIdentity as jest.Mock).mockRejectedValue(new InvalidSessionTokenError());

    const req = new NextRequest("http://localhost/api/user/consent", {
      method: "POST",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Token inválido o expirado");
    expect(clearSessionCookie).toHaveBeenCalledWith(response);
  });
});
