import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RateLimitBucket = {
  windowStartMs: number;
  count: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

/* ------------------------------------------------------------------ */
/*  In-memory store with automatic eviction                            */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_STORE = new Map<string, RateLimitBucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;

/**
 * Maximum number of keys before we force a full sweep.
 * Lowered from 10 000 to 5 000 to reduce peak memory usage (issue #12).
 */
const MAX_STORE_SIZE = 5_000;

/**
 * Probabilistic cleanup: on every call there is a 1-in-N chance we evict
 * stale entries, even when below MAX_STORE_SIZE. This prevents unbounded
 * accumulation of expired buckets between bursts.
 */
const PROBABILISTIC_CLEANUP_INV = 100; // 1 % chance per call

let lastFullCleanupMs = 0;

/**
 * Full sweep — deletes every entry whose window has expired.
 * Uses 1x windowMs (was 2x) for more aggressive eviction.
 */
function cleanupExpiredBuckets(nowMs: number, windowMs: number): void {
  for (const [key, bucket] of RATE_LIMIT_STORE.entries()) {
    if (nowMs - bucket.windowStartMs >= windowMs) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
  lastFullCleanupMs = nowMs;
}

/* ------------------------------------------------------------------ */
/*  Core rate-limit check                                              */
/* ------------------------------------------------------------------ */

export function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const nowMs = Date.now();

  // Deterministic cleanup when store exceeds hard cap
  if (RATE_LIMIT_STORE.size > MAX_STORE_SIZE) {
    cleanupExpiredBuckets(nowMs, windowMs);
  }

  // Probabilistic cleanup to avoid slow leak (issue #12)
  if (
    RATE_LIMIT_STORE.size > 0 &&
    nowMs - lastFullCleanupMs > windowMs &&
    Math.random() * PROBABILISTIC_CLEANUP_INV < 1
  ) {
    cleanupExpiredBuckets(nowMs, windowMs);
  }

  const existing = RATE_LIMIT_STORE.get(key);

  if (!existing || nowMs - existing.windowStartMs >= windowMs) {
    RATE_LIMIT_STORE.set(key, { windowStartMs: nowMs, count: 1 });
    return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterMs = windowMs - (nowMs - existing.windowStartMs);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Convenience: extract client IP from a NextRequest                  */
/* ------------------------------------------------------------------ */

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ------------------------------------------------------------------ */
/*  Higher-order wrapper for API route handlers                        */
/* ------------------------------------------------------------------ */

type RouteHandler = (
  req: NextRequest,
  ctx?: unknown,
) => Promise<NextResponse | Response> | NextResponse | Response;

/**
 * Options for `withRateLimit`.
 *
 * @param limit    Max requests per window (default 30)
 * @param windowMs Window size in ms (default 60 000 = 1 min)
 * @param keyFn    Custom key derivation; defaults to IP-based key using
 *                 the route pathname.
 */
export type WithRateLimitOptions = {
  limit?: number;
  windowMs?: number;
  keyFn?: (req: NextRequest) => string;
};

/**
 * Wraps an API route handler with rate-limiting logic.
 *
 * ```ts
 * export const GET = withRateLimit(async (req) => { ... }, { limit: 30 });
 * ```
 */
export function withRateLimit(
  handler: RouteHandler,
  options: WithRateLimitOptions = {},
): RouteHandler {
  const {
    limit = 30,
    windowMs = DEFAULT_WINDOW_MS,
    keyFn,
  } = options;

  return async (req: NextRequest, ctx?: unknown) => {
    const key =
      keyFn?.(req) ??
      `rl:${new URL(req.url).pathname}:${getClientIp(req)}`;

    const rl = checkRateLimit(key, limit, windowMs);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "TOO_MANY_REQUESTS", message: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSeconds),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const response = await handler(req, ctx);

    // Attach informational rate-limit headers to successful responses.
    if (response instanceof NextResponse) {
      response.headers.set("X-RateLimit-Limit", String(rl.limit));
      response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    }

    return response;
  };
}
