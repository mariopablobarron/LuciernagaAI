// Simple in-process TTL cache for hot-path data.
// NOT shared across serverless instances — each instance has its own cache.
// Good enough to reduce DB load significantly for repeated reads within the same process.

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

const MAX_ENTRIES = 5000;

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Returns a cached value if fresh, otherwise calls `fetcher`, caches the
   * result for `ttlMs` milliseconds, and returns it.
   */
  async get<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const cached = this.store.get(key) as CacheEntry<T> | undefined;

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const value = await fetcher();

    // Evict before inserting if at capacity
    if (!this.store.has(key) && this.store.size >= MAX_ENTRIES) {
      this.evictOldest();
    }

    this.store.set(key, { value, expiresAt: now + ttlMs, createdAt: now });
    return value;
  }

  /** Remove a single key from the cache. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Remove all keys that start with `prefix`. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Number of entries currently in the cache (useful for tests/debugging). */
  get size(): number {
    return this.store.size;
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  /**
   * Evict expired entries first; if that doesn't free enough space, drop the
   * oldest entries by `createdAt` until we're under 90% capacity.
   */
  private evictOldest(): void {
    const now = Date.now();

    // Pass 1: remove expired
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }

    if (this.store.size < MAX_ENTRIES) return;

    // Pass 2: drop oldest entries until at 90% capacity
    const target = Math.floor(MAX_ENTRIES * 0.9);
    const entries = [...this.store.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt,
    );

    for (const [key] of entries) {
      if (this.store.size <= target) break;
      this.store.delete(key);
    }
  }
}

/** Singleton cache instance shared within this process. */
export const cache = new TTLCache();
