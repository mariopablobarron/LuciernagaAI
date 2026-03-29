import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logger";

type AdminSessionPayload = {
  usr: string;
  iat: number;
  exp: number;
};

export type AdminAuthResult = {
  authenticated: boolean;
  source: "cookie" | "basic" | "none" | "invalid";
};

const ADMIN_SESSION_COOKIE = "mw_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24;
const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SECONDS * 1000;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSecret(): string {
  const configuredSecret =
    process.env.ADMIN_AUTH_SECRET?.trim() || process.env.AUTH_TOKEN_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_AUTH_SECRET or AUTH_TOKEN_SECRET is required in production");
  }

  return "dev-admin-auth-secret";
}

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (username && password) {
    return { username, password };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required in production");
  }

  return { username: "admin", password: "admin123" };
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getAdminSecret()).update(encodedPayload).digest("base64url");
}

function verifyAdminSessionToken(token: string): boolean {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payloadEncoded);
  if (!safeEqual(expectedSignature, signature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadEncoded)) as AdminSessionPayload;
    if (!parsed?.usr || !parsed?.iat || !parsed?.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      return false;
    }

    const { username } = getAdminCredentials();
    return safeEqual(parsed.usr, username);
  } catch {
    return false;
  }
}

function parseBasicAuth(req: NextRequest): { username: string; password: string } | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return null;
  }

  const encoded = authHeader.slice(6).trim();
  if (!encoded) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator <= 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function normalizeAdminNextPath(value: string | null | undefined): string {
  if (!value) {
    return "/admin";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  if (value.startsWith("/api/") || value.startsWith("/admin/login")) {
    return "/admin";
  }

  return value;
}

export function validateAdminCredentials(username: string, password: string): boolean {
  try {
    const expected = getAdminCredentials();
    return safeEqual(username, expected.username) && safeEqual(password, expected.password);
  } catch (error: unknown) {
    logError("AUTH", error, { area: "validate_admin_credentials" });
    return false;
  }
}

export function issueAdminSessionToken(): string {
  const { username } = getAdminCredentials();
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    usr: username,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function resolveAdminAuth(req: NextRequest): AdminAuthResult {
  try {
    const cookieToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (cookieToken?.trim()) {
      if (verifyAdminSessionToken(cookieToken.trim())) {
        return { authenticated: true, source: "cookie" };
      }
    }

    const basic = parseBasicAuth(req);
    if (basic) {
      if (validateAdminCredentials(basic.username, basic.password)) {
        return { authenticated: true, source: "basic" };
      }
      return { authenticated: false, source: "invalid" };
    }

    if (cookieToken?.trim()) {
      return { authenticated: false, source: "invalid" };
    }

    return { authenticated: false, source: "none" };
  } catch (error: unknown) {
    logError("AUTH", error, { area: "resolve_admin_auth" });
    return { authenticated: false, source: "invalid" };
  }
}

export function attachAdminSessionCookie(res: NextResponse, token?: string): void {
  if (!token) {
    return;
  }

  try {
    res.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
      expires: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
      path: "/",
    });
  } catch (error: unknown) {
    logError("AUTH", error, { area: "attach_admin_cookie" });
  }
}

export function clearAdminSessionCookie(res: NextResponse): void {
  try {
    res.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });
  } catch (error: unknown) {
    logError("AUTH", error, { area: "clear_admin_cookie" });
  }
}
