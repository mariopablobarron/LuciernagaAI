import { NextRequest } from "next/server";

/**
 * Validates that the request came from our own origin.
 * Checks the Origin or Referer header against APP_BASE_URL.
 * Returns true if the request is safe.
 *
 * - GET/HEAD/OPTIONS are always safe (no state mutation).
 * - If no Origin/Referer header is present (server-to-server, curl), we allow
 *   the request to avoid breaking programmatic API calls.
 * - If the header IS present, it must match our own base URL.
 */
export function validateOrigin(req: NextRequest): boolean {
  const method = req.method.toUpperCase();

  // Safe methods — skip check
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  const incoming = origin || referer;

  // No origin information at all — allow (server-to-server / curl)
  if (!incoming) {
    return true;
  }

  const baseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  if (!baseUrl) {
    // If we have no configured base URL we can't validate — allow to avoid
    // breaking local development.
    return true;
  }

  try {
    const incomingOrigin = new URL(incoming).origin;
    const expectedOrigin = new URL(baseUrl).origin;
    return incomingOrigin === expectedOrigin;
  } catch {
    // Malformed URL — reject
    return false;
  }
}
