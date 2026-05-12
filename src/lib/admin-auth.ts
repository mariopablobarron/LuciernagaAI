import { createHmac, timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import type { SystemRole } from "@prisma/client";
import { getConfig } from "@/lib/env";
import { logError } from "@/lib/logger";
import { hasPermission } from "@/lib/permissions";

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminSessionPayload = {
  /** admin user id (cuid) or "env" for legacy env-var admin */
  sub: string;
  usr: string;
  role: SystemRole;
  iat: number;
  exp: number;
};

export type AdminAuthResult = {
  authenticated: boolean;
  source: "cookie" | "basic" | "none" | "invalid";
  /** Admin user id — "env" for legacy env-var login */
  adminId?: string;
  /** Display name */
  adminName?: string;
  /** Role for RBAC checks */
  role?: SystemRole;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMIN_SESSION_COOKIE = "mw_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24;
const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SECONDS * 1000;

// ─── Crypto helpers ──────────────────────────────────────────────────────────

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSecret(): string {
  const configuredSecret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  const authTokenSecret = getConfig().AUTH_TOKEN_SECRET;
  if (authTokenSecret) return authTokenSecret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_AUTH_SECRET or AUTH_TOKEN_SECRET is required in production");
  }
  return "dev-admin-auth-secret";
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getAdminSecret()).update(encodedPayload).digest("base64url");
}

// ─── Legacy env-var credentials (fallback for initial superadmin) ────────────

function getEnvCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";

  if (username && password) return { username, password };

  // Env credentials are optional when admins exist in DB.
  // Never fall back to hardcoded credentials — any environment without
  // ADMIN_USERNAME/ADMIN_PASSWORD set must use DB-based admin accounts.
  return null;
}

// ─── Token operations ────────────────────────────────────────────────────────

function parseSessionToken(token: string): AdminSessionPayload | null {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;

  const expectedSignature = signPayload(payloadEncoded);
  if (!safeEqual(expectedSignature, signature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadEncoded)) as AdminSessionPayload;
    if (!parsed?.sub || !parsed?.usr || !parsed?.role || !parsed?.iat || !parsed?.exp) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Issue a session token embedding admin identity and role.
 */
export function issueAdminSessionToken(params: {
  adminId: string;
  username: string;
  role: SystemRole;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: params.adminId,
    usr: params.username,
    role: params.role,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

// ─── Credential validation ───────────────────────────────────────────────────

/**
 * Validate credentials against env vars (legacy superadmin fallback).
 * Returns true only if both match.
 */
export function validateEnvCredentials(username: string, password: string): boolean {
  try {
    const expected = getEnvCredentials();
    if (!expected) return false; // No env credentials configured
    return safeEqual(username.trim(), expected.username) && safeEqual(password.trim(), expected.password);
  } catch (error: unknown) {
    logError("AUTH", error, { area: "validate_env_credentials" });
    return false;
  }
}

// ─── Request auth resolution ─────────────────────────────────────────────────

function parseBasicAuth(req: NextRequest): { username: string; password: string } | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return null;

  const encoded = authHeader.slice(6).trim();
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator <= 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

/**
 * Resolve admin auth from the request (cookie or basic auth).
 * Now includes role for downstream permission checks.
 */
export function resolveAdminAuth(req: NextRequest): AdminAuthResult {
  try {
    // 1. Try cookie token (primary path)
    const cookieToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (cookieToken?.trim()) {
      const payload = parseSessionToken(cookieToken.trim());
      if (payload) {
        return {
          authenticated: true,
          source: "cookie",
          adminId: payload.sub,
          adminName: payload.usr,
          role: payload.role,
        };
      }
    }

    // 2. Try Basic auth (legacy env-var fallback)
    const basic = parseBasicAuth(req);
    if (basic) {
      if (validateEnvCredentials(basic.username, basic.password)) {
        return {
          authenticated: true,
          source: "basic",
          adminId: "env",
          adminName: basic.username,
          role: "superadmin" as SystemRole,
        };
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

// ─── Permission gate (for use in route handlers) ─────────────────────────────

/**
 * Check admin auth + permission in one call. Returns the auth result if OK,
 * or a 401/403 NextResponse if not.
 */
export function requireAdminPermission(
  req: NextRequest,
  permission: string,
): AdminAuthResult | NextResponse {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated || !auth.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(auth.role, permission)) {
    return NextResponse.json({ error: "Forbidden", requiredPermission: permission }, { status: 403 });
  }
  return auth;
}

// ─── Path helpers ────────────────────────────────────────────────────────────

export function normalizeAdminNextPath(value: string | null | undefined): string {
  if (!value) return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  if (value.startsWith("/api/") || value.startsWith("/admin/login")) return "/admin";
  return value;
}

// ─── Cookie operations ───────────────────────────────────────────────────────

export function attachAdminSessionCookie(res: NextResponse, token?: string): void {
  if (!token) return;
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
