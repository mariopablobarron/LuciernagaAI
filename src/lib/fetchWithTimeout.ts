/**
 * fetch wrapper with AbortController-based timeout.
 * Uses proper cancellation (not Promise.race) so the request is actually aborted.
 *
 * @param url      Request URL
 * @param options  Standard RequestInit options (signal is overridden)
 * @param timeoutMs Timeout in ms. Defaults: 5 000 ms for external APIs,
 *                  use FETCH_TIMEOUT_SLOW (10 000) for slower operations.
 */

export const FETCH_TIMEOUT_DEFAULT = 5_000;
export const FETCH_TIMEOUT_SLOW = 10_000;

export async function fetchWithTimeout(
  url: string,
  options: Omit<RequestInit, "signal"> = {},
  timeoutMs: number = FETCH_TIMEOUT_DEFAULT
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
