/**
 * POST /api/feedback/message
 *
 * Feedback negativo específico sobre UNA respuesta del mentor.
 * Endpoint separado de /api/user/feedback (que es feedback general
 * del producto) porque:
 *  - Acepta anónimos sin sesión (anonymous-first del producto)
 *  - Datos estructurados con messageId para análisis posterior
 *  - Persiste vía logger → SystemLog (sin migration de BD nueva)
 *
 * Cuerpo:
 *   { messageId: string, reason?: string }
 *
 * - messageId: id del mensaje del mentor que no sirvió
 * - reason: razón libre (opcional, max 500 chars)
 *
 * Respuestas:
 *   200 { ok: true }
 *   400 { error: "INVALID_MESSAGE_ID" | "REASON_TOO_LONG" }
 *   429 { error: "TOO_MANY_REQUESTS" }
 */

import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REASON_LENGTH = 500;
const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Identity: opcional. Anónimos pueden dar feedback (anonymous-first).
  let userId: string | null = null;
  try {
    const identity = await resolveIdentity(req);
    userId = identity.userId;
  } catch (err) {
    if (!(err instanceof InvalidSessionTokenError)) throw err;
  }

  // Rate limit: 3/h anon (por IP), 10/h auth (por userId).
  const key = userId
    ? `feedback:msg:user:${userId}`
    : `feedback:msg:ip:${getClientIp(req)}`;
  const limit = userId ? 10 : 3;
  const rl = checkRateLimit(key, limit, ONE_HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    messageId?: unknown;
    reason?: unknown;
  } | null;

  const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : "";
  if (!messageId || messageId.length > 200) {
    return NextResponse.json({ error: "INVALID_MESSAGE_ID" }, { status: 400 });
  }

  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      { error: "REASON_TOO_LONG", max: MAX_REASON_LENGTH },
      { status: 400 },
    );
  }

  // Persistimos en SystemLog vía logger. Análisis posterior: query
  // SystemLog WHERE event = 'message_negative' GROUP BY userId, etc.
  logInfo("FEEDBACK", "message_negative", {
    userId: userId ?? null,
    messageId,
    reason: reason || null,
    reasonLength: reason.length,
    anonymous: !userId,
  });

  return NextResponse.json(
    { ok: true },
    { headers: { "X-RateLimit-Remaining": String(rl.remaining) } },
  );
}
