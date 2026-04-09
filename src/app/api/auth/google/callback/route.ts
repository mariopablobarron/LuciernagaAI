import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, issueSessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { getGoogleConfig, exchangeCodeForTokens, getGoogleProfile } from "@/lib/google-oauth";
import { logError, logInfo } from "@/lib/logger";
import { normalizeEmail } from "@/services/user";

/**
 * GET /api/auth/google/callback?code=xxx&state=yyy
 * Handles the Google OAuth callback, creates or links the user, and issues a session.
 */
export async function GET(req: NextRequest) {
  const { enabled } = getGoogleConfig();
  if (!enabled) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 501 });
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("google_oauth_state")?.value;

  // Validate CSRF state
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_invalid_state`);
  }

  try {
    const accessToken = await exchangeCodeForTokens(code);
    const profile = await getGoogleProfile(accessToken);
    const email = normalizeEmail(profile.email);

    const prisma = getPrismaClient();

    // Find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email }] },
      select: { id: true, googleId: true, email: true },
    });

    if (user) {
      // Link Google ID if not yet linked
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id, emailVerified: true },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name,
          googleId: profile.id,
          emailVerified: true, // Google email is verified by Google
        },
        select: { id: true, googleId: true, email: true },
      });
      logInfo("AUTH", "google_signup", { userId: user.id, email });
    }

    const token = issueSessionToken(user.id);
    const res = NextResponse.redirect(`${baseUrl}/app`);
    attachSessionCookie(res, token);
    // Clear the OAuth state cookie
    res.cookies.delete("google_oauth_state");

    logInfo("AUTH", "google_login", { userId: user.id, email });
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/google/callback" });
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }
}
