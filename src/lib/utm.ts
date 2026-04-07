/**
 * UTM parameter capture and retrieval — client-side only.
 *
 * On first page load, reads UTM query params from the URL and stores them in
 * sessionStorage so they survive in-app navigation. The stored values are
 * attached to signup / waitlist API calls for conversion attribution.
 */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "_utm";

/**
 * Read UTM params from the current URL and persist them in sessionStorage.
 * Only writes if at least one UTM param is present and nothing is stored yet
 * (first touch within the session wins).
 */
export function captureUtmParams(): void {
  if (typeof window === "undefined") return;

  // Don't overwrite — first touch wins for the session
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  const url = new URL(window.location.href);
  const params: UtmParams = {};
  let hasAny = false;

  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key);
    if (value) {
      params[key] = value;
      hasAny = true;
    }
  }

  if (hasAny) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  }
}

/**
 * Return the UTM params captured earlier in this session, or an empty object.
 */
export function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}
