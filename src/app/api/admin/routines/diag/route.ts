import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to debug auto-register issues without exposing the
 * secret value. Returns:
 *  - present: whether ROUTINES_REGISTER_SECRET is set in env
 *  - rawLen: byte length of the raw env value (catches quote wrapping)
 *  - peeledLen: length after stripping surrounding whitespace + quotes
 *  - charset: a coarse fingerprint (only flags whether non-hex chars are present)
 *
 * No part of the actual secret leaves the server.
 */
function unwrap(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/^[\s'"`]+|[\s'"`]+$/g, "");
}

export async function GET() {
  const raw = process.env.ROUTINES_REGISTER_SECRET ?? "";
  const peeled = unwrap(raw);
  const isHexOnly = /^[0-9a-fA-F]+$/.test(peeled);
  return NextResponse.json({
    present: raw.length > 0,
    rawLen: raw.length,
    peeledLen: peeled.length,
    hexOnly: isHexOnly,
    delta: raw.length - peeled.length, // chars peeled (quotes/whitespace)
  });
}
