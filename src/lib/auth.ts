import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";

type SessionPayload = {
  uid: string;
  iat: number;
  exp: number;
};

type TokenVerificationResult =
  | { kind: "valid"; payload: SessionPayload }
  | { kind: "expired"; payload: SessionPayload }
  | { kind: "invalid" };

export type IdentitySource = "session" | "generated" | "refreshed";

export type ResolvedIdentity = {
  userId: string;
  source: IdentitySource;
  sessionToken: string;
  shouldSetCookie: boolean;
};

export class InvalidSessionTokenError extends Error {
  constructor() {
    super("Invalid or expired session token");
    this.name = "InvalidSessionTokenError";
  }
}

const SESSION_COOKIE_NAME = "mw_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const USER_ID_PATTERN = /^[a-zA-Z0-9._:-]{3,64}$/;

function getSessionSecret(): string {
  const authSecret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (authSecret) {
    return authSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TOKEN_SECRET is required in production");
  }

  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    "dev-insecure-session-secret"
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(input: string): string {
  return createHmac("sha256", getSessionSecret()).update(input).digest("base64url");
}

function isValidUserId(value: string): boolean {
  return USER_ID_PATTERN.test(value);
}

export function issueSessionToken(userId: string): string {
  if (!isValidUserId(userId)) {
    throw new Error("Cannot issue token for invalid user id");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: userId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

function verifyToken(token: string): TokenVerificationResult {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return { kind: "invalid" };
  }

  const expectedSignature = signValue(payloadEncoded);
  if (!safeEqual(expectedSignature, signature)) {
    return { kind: "invalid" };
  }

  try {
    const decoded = base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(decoded) as SessionPayload;

    if (!payload?.uid || !payload?.exp || !payload?.iat) {
      return { kind: "invalid" };
    }

    if (!isValidUserId(payload.uid)) {
      return { kind: "invalid" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return { kind: "expired", payload };
    }

    return { kind: "valid", payload };
  } catch {
    return { kind: "invalid" };
  }
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const headerToken = req.headers.get("x-session-token");
  if (headerToken?.trim()) {
    return headerToken.trim();
  }

  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken?.trim()) {
    return cookieToken.trim();
  }

  return null;
}

function buildGeneratedUserId(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const firstIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const fingerprint = createHmac("sha1", getSessionSecret())
    .update(`${firstIp}|${userAgent}`)
    .digest("hex")
    .slice(0, 16);

  return `anon_${fingerprint}`;
}

export function resolveIdentity(req: NextRequest): ResolvedIdentity {
  const requestToken = getTokenFromRequest(req);

  if (requestToken) {
    const verified = verifyToken(requestToken);
    if (verified.kind === "valid") {
      return {
        userId: verified.payload.uid,
        source: "session",
        sessionToken: requestToken,
        shouldSetCookie: false,
      };
    }

    if (verified.kind === "expired") {
      const refreshedToken = issueSessionToken(verified.payload.uid);
      return {
        userId: verified.payload.uid,
        source: "refreshed",
        sessionToken: refreshedToken,
        shouldSetCookie: true,
      };
    }

    if (verified.kind === "invalid") {
      logInfo("CHAT", "invalid_session_token");
      throw new InvalidSessionTokenError();
    }
  }

  const generatedUserId = buildGeneratedUserId(req);
  const sessionToken = issueSessionToken(generatedUserId);

  return {
    userId: generatedUserId,
    source: "generated",
    sessionToken,
    shouldSetCookie: true,
  };
}

export function attachSessionCookie(res: NextResponse, sessionToken?: string): void {
  if (!sessionToken) {
    return;
  }

  try {
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_SECONDS,
      expires: new Date(Date.now() + SESSION_TTL_MS),
      path: "/",
    });
  } catch (error: unknown) {
    logError("CHAT", error, { area: "attach_session_cookie_failed" });
  }
}

export function clearSessionCookie(res: NextResponse): void {
  try {
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
    });
  } catch (error: unknown) {
    logError("CHAT", error, { area: "clear_session_cookie_failed" });
  }
}
