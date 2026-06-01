import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, issueSessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { getGoogleConfig, exchangeCodeForTokens, getGoogleProfile } from "@/lib/google-oauth";
import { logError, logInfo } from "@/lib/logger";
import { normalizeEmail } from "@/services/user";
import { triggerWelcomeAvatarVideoAsync } from "@/services/welcomeAvatarVideo";
import { scheduleOnboardingEmails } from "@/services/onboarding-emails";
import { buildWelcomeEmail, sendUserEmail } from "@/lib/email";
import { pickEmailLocale } from "@/lib/email-i18n";

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
    logError("AUTH", new Error("OAuth state mismatch"), {
      hasCode: !!code,
      hasState: !!state,
      hasStoredState: !!storedState,
      match: state === storedState,
    });
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
      select: { id: true, googleId: true, email: true, consentGiven: true, consentVersion: true },
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
      // Create new user — sin consentGiven, lo capturamos en /signup/consent
      // antes de dejar entrar a /app. Google verifica el email por nosotros,
      // pero el consentimiento legal no se puede asumir.
      const created = await prisma.user.create({
        data: {
          email,
          name: profile.name,
          googleId: profile.id,
          emailVerified: true,
        },
        select: { id: true, googleId: true, email: true, consentGiven: true, consentVersion: true },
      });
      user = created;
      logInfo("AUTH", "google_signup", { userId: user.id, email });
      triggerWelcomeAvatarVideoAsync(user.id);

      // Welcome email + onboarding sequence (day 1, 3, 7). Sin esto, los
      // usuarios que entran por Google nunca recibían el flujo de
      // bienvenida — solo lo recibían los que pasaban por /api/auth/signup
      // (email+password). Bug detectado 31-05-2026: 3 google_signups en
      // 30 días, 0 onboarding scheduled.
      const welcomeLocale = pickEmailLocale(null);
      const welcomeEmail = buildWelcomeEmail({
        name: profile.name ?? null,
        appUrl: baseUrl,
        locale: welcomeLocale,
      });
      sendUserEmail({
        to: email,
        ...welcomeEmail,
        userId: user.id,
        template: "welcome",
        locale: welcomeLocale,
      }).catch((e) => logError("AUTH", e, { action: "send_welcome_email_google", email }));
      scheduleOnboardingEmails(user.id).catch(
        (e) => logError("AUTH", e, { action: "schedule_onboarding_emails_google", email }),
      );
    }

    const token = issueSessionToken(user.id);
    // Si no ha aceptado el consent (o aceptó una versión antigua), antes de
    // entrar al app le forzamos el flujo de aceptación. /signup/consent
    // muestra el checkbox y al confirmar redirige a /app.
    const needsConsent = !user.consentGiven;
    const redirectPath = needsConsent ? "/signup/consent?from=google" : "/app";
    const res = NextResponse.redirect(`${baseUrl}${redirectPath}`);
    attachSessionCookie(res, token);
    res.cookies.delete("google_oauth_state");

    logInfo("AUTH", "google_login", { userId: user.id, email, needsConsent });
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/google/callback" });
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }
}
