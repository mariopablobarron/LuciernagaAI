import { isTrackingMuted } from "@/lib/tracking-mute";

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

// distinct_id estable por navegador (anónimo). Sirve para PostHog y para
// asociar eventos del mismo usuario antes/después de identificar email.
function getOrCreateDistinctId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    let id = window.localStorage.getItem("ph_distinct_id");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem("ph_distinct_id", id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

// Manda evento a PostHog vía HTTP API (sin SDK — no añade peso al bundle).
// No-op si NEXT_PUBLIC_POSTHOG_KEY no está set o si el tracking está muteado.
function postHogCapture(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
  const distinctId = getOrCreateDistinctId();
  void fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event: eventName,
      distinct_id: distinctId,
      properties: {
        ...params,
        $current_url: window.location.href,
        $host: window.location.host,
        $pathname: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
    }),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Track a custom event. Despacha a Google Analytics 4 (gtag) y, si está
 * configurado, a PostHog. No-ops grácil si nada está cargado o el tracking
 * está muteado (cuenta interna/test).
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  if (isTrackingMuted()) return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  postHogCapture(eventName, params);
}
