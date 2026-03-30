jest.mock("@/lib/auth", () => {
  class MockInvalidSessionTokenError extends Error {
    constructor() {
      super("Invalid or expired session token");
      this.name = "InvalidSessionTokenError";
    }
  }

  return {
    InvalidSessionTokenError: MockInvalidSessionTokenError,
    resolveIdentity: jest.fn(),
    attachSessionCookie: jest.fn(),
    clearSessionCookie: jest.fn(),
  };
});

jest.mock("@/services/conversation", () => ({
  createConversationForUser: jest.fn(),
  ensureUserSession: jest.fn(),
  listConversationsForUser: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { InvalidSessionTokenError, resolveIdentity, clearSessionCookie } from "@/lib/auth";
import {
  createConversationForUser,
  ensureUserSession,
  listConversationsForUser,
} from "@/services/conversation";

describe("GET /api/conversations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna conversaciones cuando la sesión es válida", async () => {
    (resolveIdentity as jest.Mock).mockReturnValue({
      userId: "usr_test_1",
      source: "session",
      sessionToken: "token",
      shouldSetCookie: false,
    });
    (ensureUserSession as jest.Mock).mockResolvedValue(undefined);
    (listConversationsForUser as jest.Mock).mockResolvedValue([
      {
        id: "conv_1",
        title: "Primera conversación",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:10:00.000Z"),
        messageCount: 2,
      },
    ]);

    const req = new NextRequest("http://localhost/api/conversations");
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.conversations).toHaveLength(1);
    expect(body.conversations[0].id).toBe("conv_1");
  });

  it("retorna 401 cuando no hay sesión válida", async () => {
    (resolveIdentity as jest.Mock).mockImplementation(() => {
      throw new InvalidSessionTokenError();
    });

    const req = new NextRequest("http://localhost/api/conversations");
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe("INVALID_SESSION_TOKEN");
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/conversations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crea una conversación para el usuario autenticado", async () => {
    (resolveIdentity as jest.Mock).mockReturnValue({
      userId: "usr_test_2",
      source: "session",
      sessionToken: "token",
      shouldSetCookie: false,
    });
    (ensureUserSession as jest.Mock).mockResolvedValue(undefined);
    (createConversationForUser as jest.Mock).mockResolvedValue({
      id: "conv_new_1",
      title: "Objetivo semanal",
      createdAt: new Date("2026-03-30T00:00:00.000Z"),
      updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    });

    const req = new NextRequest("http://localhost/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "Objetivo semanal" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.conversation.id).toBe("conv_new_1");
    expect(createConversationForUser).toHaveBeenCalledWith("usr_test_2", "Objetivo semanal");
  });

  it("retorna 401 si el token es inválido", async () => {
    (resolveIdentity as jest.Mock).mockImplementation(() => {
      throw new InvalidSessionTokenError();
    });

    const req = new NextRequest("http://localhost/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "Nueva conversación" }),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe("INVALID_SESSION_TOKEN");
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});
