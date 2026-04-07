import { createHmac, timingSafeEqual } from "crypto";
import { logError, logInfo } from "@/lib/logger";

/**
 * Org admin token utilities.
 *
 * Tokens are HMAC-SHA256 signed payloads containing the admin ID and an
 * expiry timestamp. They use the same AUTH_TOKEN_SECRET as the main session
 * system so there is a single secret to manage.
 */

const ORG_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// ─── secret ───────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TOKEN_SECRET is required in production");
  }

  return process.env.SESSION_SECRET?.trim() || "dev-insecure-session-secret";
}

// ─── encoding helpers ─────────────────────────────────────────────────

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ─── public API ───────────────────────────────────────────────────────

/**
 * Issue a signed org-admin token containing the admin ID and a 24-hour expiry.
 */
export function issueOrgToken(adminId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    sub: adminId,
    iat: now,
    exp: now + ORG_TOKEN_TTL_SECONDS,
  });

  const encoded = base64UrlEncode(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify a signed org-admin token. Returns the admin ID on success, or null
 * if the token is malformed, tampered with, or expired.
 */
export function verifyOrgToken(token: string): { adminId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    logInfo("ORG", "org_token_verify_failed_malformed");
    return null;
  }

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  if (!safeEqual(expectedSignature, signature)) {
    logInfo("ORG", "org_token_verify_failed_signature");
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as {
      sub?: string;
      iat?: number;
      exp?: number;
    };

    if (!payload.sub || !payload.exp || !payload.iat) {
      logInfo("ORG", "org_token_verify_failed_payload_shape");
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      logInfo("ORG", "org_token_verify_expired", { sub: payload.sub });
      return null;
    }

    logInfo("ORG", "org_token_verify_success", { sub: payload.sub });
    return { adminId: payload.sub };
  } catch {
    logError("ORG", new Error("org_token_parse_error"), { action: "verifyOrgToken" });
    return null;
  }
}
