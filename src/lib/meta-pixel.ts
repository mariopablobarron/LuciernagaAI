/**
 * Meta (Facebook) Pixel helper — client-side only.
 *
 * Usage:
 *   import { trackMetaEvent } from "@/lib/meta-pixel";
 *   trackMetaEvent("CompleteRegistration");
 *   trackMetaEvent("Lead", { content_name: "quiz" });
 */

import { isTrackingMuted } from "@/lib/tracking-mute";

declare global {
  interface Window {
    fbq?: (
      action: string,
      eventOrId: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

/**
 * Fire a Meta Pixel standard or custom event.
 * No-ops gracefully when the pixel is not loaded (e.g. missing env var,
 * ad-blocker) or when the current session is flagged internal (team/test).
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }
  if (isTrackingMuted()) return;
  if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}
