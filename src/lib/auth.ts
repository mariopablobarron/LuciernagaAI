import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { ensureUserAccount, linkIdentityToEmail } from "@/services/user";

type SessionPayload = {
  uid: string;
  iat: number;
  exp: number;
};

type TokenVerificationResult =
  | { kind: "valid"; payload: SessionPayload }
  | { kind: "expired"; payload: SessionPayload }
  | { kind: "invalid" };

export type IdentitySource = "session" | "generated" | "refreshed" | "linked";

export type ResolvedIdentity = {
  userId: string;
  source: IdentitySource;
  sessionToken: string;
  shouldSetCookie: boolean;
};

type ResolveIdentityOptions = {
  allowAnonymousBootstrap?: boolean;
  email?: string;
  name?: string | null;
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
    logInfo("CHAT", "auth_token_secret_loaded");
    return authSecret;
  }

  if (process.env.NODE_ENV === "production") {
    logError("CHAT", new Error("Missing AUTH_TOKEN_SECRET in production"), {
      area: "get_session_secret",
    });
    throw new Error("AUTH_TOKEN_SECRET is required in production");
  }

  logInfo("CHAT", "auth_token_secret_fallback_in_use", {
    nodeEnv: process.env.NODE_ENV || "development",
  });
  return process.env.SESSION_SECRET?.trim() || "dev-insecure-session-secret";
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

function createGeneratedUserId(): string {
  const raw = randomUUID().replace(/-/g, "").slice(0, 24);
  return `usr_${raw}`;
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
  logInfo("CHAT", "verify_token_started", {
    hasToken: !!token,
    tokenLength: token.length,
  });
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    logInfo("CHAT", "verify_token_failed_malformed");
    return { kind: "invalid" };
  }

  const expectedSignature = signValue(payloadEncoded);
  if (!safeEqual(expectedSignature, signature)) {
    logInfo("CHAT", "verify_token_failed_signature");
    return { kind: "invalid" };
  }

  try {
    const decoded = base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(decoded) as SessionPayload;

    if (!payload?.uid || !payload?.exp || !payload?.iat) {
      logInfo("CHAT", "verify_token_failed_payload_shape");
      return { kind: "invalid" };
    }

    if (!isValidUserId(payload.uid)) {
      logInfo("CHAT", "verify_token_failed_uid_invalid");
      return { kind: "invalid" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      logInfo("CHAT", "verify_token_expired", {
        uid: payload.uid,
        exp: payload.exp,
        now,
      });
      return { kind: "expired", payload };
    }

    logInfo("CHAT", "verify_token_success", { uid: payload.uid });
    return { kind: "valid", payload };
  } catch {
    logInfo("CHAT", "verify_token_failed_parse");
    return { kind: "invalid" };
  }
}

function getTokenFromRequest(req: NextRequest): {
  token: string | null;
  source: "authorization" | "header" | "cookie" | "none";
} {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return {
      token: authHeader.slice(7).trim(),
      source: "authorization",
    };
  }

  const headerToken = req.headers.get("x-session-token");
  if (headerToken?.trim()) {
    return {
      token: headerToken.trim(),
      source: "header",
    };
  }

  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken?.trim()) {
    return {
      token: cookieToken.trim(),
      source: "cookie",
    };
  }

  return {
    token: null,
    source: "none",
  };
}

async function finalizeIdentity(
  identity: ResolvedIdentity,
  options: ResolveIdentityOptions
): Promise<ResolvedIdentity> {
  await ensureUserAccount(identity.userId);

  const requestedEmail = options.email?.trim();
  if (!requestedEmail) {
    return identity;
  }

  const linkedIdentity = await linkIdentityToEmail({
    currentUserId: identity.userId,
    email: requestedEmail,
    name: options.name,
  });

  if (linkedIdentity.userId !== identity.userId) {
    return {
      userId: linkedIdentity.userId,
      source: "linked",
      sessionToken: issueSessionToken(linkedIdentity.userId),
      shouldSetCookie: true,
    };
  }

  return {
    ...identity,
    source: "linked",
  };
}

export async function resolveIdentity(
  req: NextRequest,
  options: ResolveIdentityOptions = {}
): Promise<ResolvedIdentity> {
  const requestTokenInfo = getTokenFromRequest(req);
  const requestToken = requestTokenInfo.token;
  logInfo("CHAT", "resolve_identity_started", {
    hasToken: !!requestToken,
    tokenSource: requestTokenInfo.source,
  });

  if (requestToken) {
    const verified = verifyToken(requestToken);
    if (verified.kind === "valid") {
      logInfo("CHAT", "resolve_identity_valid_session", {
        userId: verified.payload.uid,
      });
      return finalizeIdentity(
        {
          userId: verified.payload.uid,
          source: "session",
          sessionToken: requestToken,
          shouldSetCookie: false,
        },
        options
      );
    }

    if (verified.kind === "expired") {
      const refreshedToken = issueSessionToken(verified.payload.uid);
      logInfo("CHAT", "resolve_identity_refreshed_session", {
        userId: verified.payload.uid,
      });
      return finalizeIdentity(
        {
          userId: verified.payload.uid,
          source: "refreshed",
          sessionToken: refreshedToken,
          shouldSetCookie: true,
        },
        options
      );
    }

    if (verified.kind === "invalid") {
      logInfo("CHAT", "resolve_identity_invalid_session_token", {
        tokenSource: requestTokenInfo.source,
      });
      throw new InvalidSessionTokenError();
    }
  }

  if (options.allowAnonymousBootstrap) {
    const userId = createGeneratedUserId();
    const sessionToken = issueSessionToken(userId);

    logInfo("CHAT", "bootstrap_session_generated", {
      userId,
    });

    return finalizeIdentity(
      {
        userId,
        source: "generated",
        sessionToken,
        shouldSetCookie: true,
      },
      options
    );
  }

  // En modo normal, si no hay sesión válida exigimos autenticación explícita.
  // MVP MODE (opt-in) queda arriba para entornos de demo.
  throw new InvalidSessionTokenError();
}

export async function bootstrapSessionIdentity(req: NextRequest): Promise<ResolvedIdentity> {
  try {
    return await resolveIdentity(req, {
      allowAnonymousBootstrap: true,
    });
  } catch (error: unknown) {
    if (!(error instanceof InvalidSessionTokenError)) {
      throw error;
    }

    // Fallback defensivo: si por alguna razón no se pudo resolver la identidad
    // pero sí debemos aislar la sesión, generamos una nueva.
    const userId = createGeneratedUserId();
    const sessionToken = issueSessionToken(userId);

    logInfo("CHAT", "bootstrap_session_generated_fallback", {
      userId,
    });

    return {
      userId,
      source: "generated",
      sessionToken,
      shouldSetCookie: true,
    };
  }
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
