/**
 * Tracking mute — suppresses client-side analytics (GA, Meta Pixel) for
 * internal accounts (team/test). Prevents the team's own activity from
 * skewing conversion pixels when we test flows in production.
 *
 * The flag is set once sessionProfile loads with an email that matches the
 * internal rules (see `team-emails.ts`). `trackEvent` and `trackMetaEvent`
 * short-circuit silently while the flag is on.
 */

import { isTeamEmail, isTestEmail } from "@/lib/team-emails";

let muted = false;

export function setTrackingMutedFromProfile(profile: {
  email?: string | null;
  name?: string | null;
} | null): void {
  if (!profile) {
    muted = false;
    return;
  }
  muted = isTeamEmail(profile.email) || isTestEmail(profile.email, profile.name);
}

export function isTrackingMuted(): boolean {
  return muted;
}

export function setTrackingMutedForTests(value: boolean): void {
  muted = value;
}
