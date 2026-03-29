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

const RATE_LIMIT_STORE = new Map<string, RateLimitBucket>();
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;

function cleanupExpiredBuckets(nowMs: number, windowMs: number): void {
  for (const [key, bucket] of RATE_LIMIT_STORE.entries()) {
    if (nowMs - bucket.windowStartMs > windowMs * 2) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS
): RateLimitResult {
  const nowMs = Date.now();

  if (RATE_LIMIT_STORE.size > 10_000) {
    cleanupExpiredBuckets(nowMs, windowMs);
  }

  const existing = RATE_LIMIT_STORE.get(key);

  if (!existing || nowMs - existing.windowStartMs >= windowMs) {
    RATE_LIMIT_STORE.set(key, {
      windowStartMs: nowMs,
      count: 1,
    });

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
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
  RATE_LIMIT_STORE.set(key, existing);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
  };
}
