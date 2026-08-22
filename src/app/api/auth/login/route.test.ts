jest.mock("@/services/user", () => ({
  IdentityLinkConflictError: class IdentityLinkConflictError extends Error {
    constructor() {
      super("IDENTITY_ALREADY_LINKED");
      this.name = "IdentityLinkConflictError";
    }
  },
  UserAccountDisabledError: class UserAccountDisabledError extends Error {
    reason: "deleted" | "deactivated";
    constructor(reason: "deleted" | "deactivated" = "deactivated") {
      super("USER_ACCOUNT_DISABLED");
      this.name = "UserAccountDisabledError";
      this.reason = reason;
    }
  },
  assertUserAccountUsable: jest.fn().mockResolvedValue(undefined),
  normalizeEmail: jest.fn((email: string) => email.trim().toLowerCase()),
  ensureUserAccount: jest.fn().mockResolvedValue({
    id: "usr_login_anon",
    email: "usr_login_anon@session.luciernaga.local",
    name: null,
    role: "user",
    lastSeen: new Date("2026-03-30T00:00:00.000Z"),
  }),
  linkIdentityToEmail: jest.fn().mockResolvedValue({
    userId: "usr_real_1",
  }),
  getUserSessionProfile: jest.fn().mockResolvedValue({
    id: "usr_real_1",
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
import {
  IdentityLinkConflictError,
  linkIdentityToEmail,
} from "@/services/user";
import { POST } from "./route";

const linkIdentityToEmailMock = jest.mocked(linkIdentityToEmail);

describe("POST /api/auth/login", () => {
  it("crea o vincula una cuenta real por email y emite cookie", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "persona@example.com" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.authenticated).toBe(true);
    expect(body.user.email).toBe("persona@example.com");
    expect(body.user.isAnonymous).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("mw_session=");
  });

  it("rechaza emails inválidos", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "no-valido" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("EMAIL_INVALID");
  });

  it("no convierte un email existente en login sin contraseña", async () => {
    linkIdentityToEmailMock.mockRejectedValueOnce(new IdentityLinkConflictError());
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "victim@example.com" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual(expect.objectContaining({
      success: false,
      authenticated: false,
      error: "IDENTITY_ALREADY_LINKED",
    }));
    expect(body.token).toBeUndefined();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
