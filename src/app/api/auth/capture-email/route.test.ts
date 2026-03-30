jest.mock("@/services/user", () => ({
  IdentityLinkConflictError: class IdentityLinkConflictError extends Error {
    constructor() {
      super("IDENTITY_ALREADY_LINKED");
      this.name = "IdentityLinkConflictError";
    }
  },
  normalizeEmail: jest.fn((email: string) => email.trim().toLowerCase()),
  ensureUserAccount: jest.fn().mockResolvedValue({
    id: "usr_capture_anon",
    email: "usr_capture_anon@session.luciernaga.local",
    name: null,
    role: "user",
    lastSeen: new Date("2026-03-30T00:00:00.000Z"),
  }),
  linkIdentityToEmail: jest.fn().mockResolvedValue({
    userId: "usr_real_capture",
  }),
  getUserSessionProfile: jest.fn().mockResolvedValue({
    id: "usr_real_capture",
    email: "persona@example.com",
    name: null,
    role: "user",
    plan: "free",
    planLabel: "Free",
    subscriptionStatus: "free",
    hasPlan: false,
    isAnonymous: false,
    messagesUsedToday: 0,
    messagesRemainingToday: 10,
    messageLimitPerDay: 10,
  }),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/auth/capture-email", () => {
  it("captura email y vincula la sesión actual sin password", async () => {
    const req = new NextRequest("http://localhost/api/auth/capture-email", {
      method: "POST",
      body: JSON.stringify({
        email: "persona@example.com",
        sessionId: "usr_capture_anon",
      }),
      headers: {
        "content-type": "application/json",
        cookie: "mw_session=dummy",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("persona@example.com");
    expect(body.futureAuthReady).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("mw_session=");
  });

  it("rechaza email inválido", async () => {
    const req = new NextRequest("http://localhost/api/auth/capture-email", {
      method: "POST",
      body: JSON.stringify({
        email: "no-valido",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("EMAIL_INVALID");
  });
});
