import { createHash, randomBytes } from "crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Generate a random opaque token. Returns the raw token (sent to user)
 *  and its SHA-256 hash (stored in the DB). */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = sha256(raw);
  return { raw, hash };
}

export function hashResetToken(raw: string): string {
  return sha256(raw);
}

export function resetTokenExpiry(): Date {
  return new Date(Date.now() + TTL_MS);
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
