/**
 * HMAC-signed tracking tokens for admin message read receipts.
 *
 * Prevents anonymous actors from marking messages as read by guessing IDs.
 * Token = base64url(HMAC-SHA256("track:" + messageId))
 */
import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TOKEN_SECRET is required in production");
  }
  return "dev-insecure-tracking-secret";
}

export function signTrackingToken(messageId: string): string {
  return createHmac("sha256", getSecret())
    .update(`track:${messageId}`)
    .digest("base64url");
}

export function verifyTrackingToken(messageId: string, token: string): boolean {
  try {
    const expected = signTrackingToken(messageId);
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(token, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
