/**
 * @jest-environment node
 */
import type { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  resolveIdentity: jest.fn(async () => {
    throw new Error("anonymous");
  }),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(() => ({
    user: { update: jest.fn(async () => null) },
  })),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

import { POST } from "./route";

function makeReq(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe("POST /api/auth/declare-age", () => {
  it("rejects malformed JSON", async () => {
    const req = {
      json: async () => {
        throw new Error("bad");
      },
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INVALID_JSON");
  });

  it("rejects unknown bucket", async () => {
    const res = await POST(makeReq({ bucket: "old" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INVALID_BUCKET");
  });

  it("blocks under_14 with redirect and a cookie", async () => {
    const res = await POST(makeReq({ bucket: "under_14" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; blocked: boolean; redirect: string };
    expect(body.ok).toBe(true);
    expect(body.blocked).toBe(true);
    expect(body.redirect).toBe("/menores");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("mentor_age_state=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("accepts a valid age range and sets cookie", async () => {
    const res = await POST(makeReq({ bucket: "30_49" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; ageRange: string };
    expect(body.ok).toBe(true);
    expect(body.ageRange).toBe("30_49");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("mentor_age_state=");
  });
});
