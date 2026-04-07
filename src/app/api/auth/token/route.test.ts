jest.mock("@/services/user", () => ({
  ensureUserAccount: jest.fn().mockResolvedValue({
    id: "usr_mock",
    email: "anon@session.luciernaga.local",
    name: null,
    role: "user",
    lastSeen: new Date("2026-03-30T00:00:00.000Z"),
  }),
  linkIdentityToEmail: jest.fn(),
  touchLastSeen: jest.fn(),
  getUserSessionProfile: jest.fn().mockResolvedValue({
    id: "usr_mock",
    email: "anon@session.luciernaga.local",
    name: null,
    role: "user",
    plan: "free",
    planLabel: "Free",
    subscriptionStatus: "free",
    hasPlan: false,
    isAnonymous: true,
    messagesUsedToday: 0,
    messagesRemainingToday: 10,
    messageLimitPerDay: 10,
  }),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";

describe("/api/auth/token", () => {
  it("POST crea sesión y devuelve token", async () => {
    const req = new NextRequest("http://localhost/api/auth/token", {
      method: "POST",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.authenticated).toBe(true);
    expect(typeof body.userId).toBe("string");
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(0);
    expect(body.user.planLabel).toBe("Free");
    expect(response.headers.get("set-cookie")).toContain("mw_session=");
  });

  it("GET valida sesión actual con cookie", async () => {
    const bootstrapReq = new NextRequest("http://localhost/api/auth/token", {
      method: "POST",
    });
    const bootstrapResponse = await POST(bootstrapReq);
    const cookieHeader = bootstrapResponse.headers.get("set-cookie");
    expect(cookieHeader).toContain("mw_session=");

    const req = new NextRequest("http://localhost/api/auth/token", {
      method: "GET",
      headers: {
        cookie: (cookieHeader || "").split(";")[0],
      },
    });

    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.authenticated).toBe(true);
    expect(typeof body.userId).toBe("string");
    expect(body.user.isAnonymous).toBe(true);
  });
});
