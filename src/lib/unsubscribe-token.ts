/**
 * Signed unsubscribe tokens for email opt-out links.
 *
 * Uses HMAC-SHA256 keyed on AUTH_TOKEN_SECRET so only the server
 * can produce valid tokens. The email address is the payload —
 * no expiry, per RFC 8058 (one-click unsubscribe should work forever).
 *
 * Token format: base64url(HMAC-SHA256(email))
 */
import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TOKEN_SECRET is required in production");
  }
  return "dev-insecure-unsubscribe-secret";
}

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", getSecret())
    .update(email.toLowerCase().trim())
    .digest("base64url");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = signUnsubscribeToken(email);
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(token, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
