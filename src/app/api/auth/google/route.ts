import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleConfig, getGoogleAuthUrl } from "@/lib/google-oauth";

/**
 * GET /api/auth/google
 * Redirects to Google OAuth consent screen.
 */
export async function GET(req: NextRequest) {
  const { enabled } = getGoogleConfig();
  if (!enabled) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 501 });
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = getGoogleAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  // Store state in cookie for CSRF validation on callback
  const isSecure = req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 600, // 10 min
    path: "/",
  });

  return res;
}
