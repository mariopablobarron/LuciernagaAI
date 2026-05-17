/**
 * POST /api/voice/tts
 *
 * Genera audio del mentor desde texto. Devuelve audio/mpeg en stream.
 *
 * Rate limit diferenciado:
 *   - Anónimos: 25 TTS/hora por IP
 *   - Logged-in: 100 TTS/hora por userId
 *
 * Cache LRU server-side (ver src/lib/elevenlabs/tts.ts) — la misma
 * respuesta del mentor se sirve sin gasto las veces siguientes.
 *
 * Body JSON:
 *   - text: string (max TTS_MAX_CHARS_PER_REQUEST)
 *   - locale: "es"|"en"|"pt"|"fr" (no usado hoy — la voz es multilingual,
 *     pero lo aceptamos para futuro)
 *   - voiceId: string (opcional, override de la voz default)
 *
 * Respuestas:
 *   200 audio/mpeg con header `X-TTS-Cached: 0|1`
 *   400 { error: "MISSING_TEXT" | "TEXT_TOO_LONG" }
 *   401 { error: "QUOTA_EXCEEDED" }
 *   429 { error: "TOO_MANY_REQUESTS", retryAfter }
 *   500 { error: "TTS_FAILED" }
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { synthesize } from "@/lib/elevenlabs/tts";
import { ElevenLabsError } from "@/lib/elevenlabs/client";
import { TTS_MAX_CHARS_PER_REQUEST, VOICE_RATE_LIMITS } from "@/lib/elevenlabs/voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_HOUR_MS = 60 * 60 * 1000;

type TTSBody = { text?: unknown; locale?: unknown; voiceId?: unknown };

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const isAuth = !!identity.userId;

    const key = isAuth
      ? `voice:tts:user:${identity.userId}`
      : `voice:tts:ip:${getClientIp(req)}`;
    const limit = isAuth
      ? VOICE_RATE_LIMITS.TTS_PER_HOUR_AUTH
      : VOICE_RATE_LIMITS.TTS_PER_HOUR_ANON;
    const rl = checkRateLimit(key, limit, ONE_HOUR_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "TOO_MANY_REQUESTS", retryAfter: rl.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = (await req.json().catch(() => null)) as TTSBody | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "MISSING_TEXT" }, { status: 400 });
    }
    if (text.length > TTS_MAX_CHARS_PER_REQUEST) {
      return NextResponse.json(
        { error: "TEXT_TOO_LONG", max: TTS_MAX_CHARS_PER_REQUEST },
        { status: 400 },
      );
    }
    const voiceId = typeof body?.voiceId === "string" && body.voiceId.length > 0
      ? body.voiceId
      : undefined;

    const result = await synthesize(text, { voiceId });

    logInfo("VOICE", "tts_ok", {
      userId: identity.userId ?? null,
      cached: result.cached,
      bytes: result.audio.byteLength,
      textLen: text.length,
      voiceId: result.voiceId,
    });

    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.audio.byteLength),
        "X-TTS-Cached": result.cached ? "1" : "0",
        "X-RateLimit-Remaining": String(rl.remaining),
        // Cache-Control: cliente puede cachear 1h (mismo audio para mismo hash).
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof ElevenLabsError) {
      const status =
        err.kind === "quota_exceeded" ? 401 :
        err.kind === "bad_request" ? 400 :
        err.kind === "rate_limited" ? 429 :
        500;
      logError("VOICE", err, { kind: err.kind, route: "/api/voice/tts" });
      return NextResponse.json(
        { error: err.kind.toUpperCase(), message: err.message.slice(0, 200) },
        { status, ...(err.kind === "rate_limited" ? { headers: { "Retry-After": "60" } } : {}) },
      );
    }
    logError("VOICE", err, { route: "/api/voice/tts" });
    return NextResponse.json({ error: "TTS_FAILED" }, { status: 500 });
  }
}
