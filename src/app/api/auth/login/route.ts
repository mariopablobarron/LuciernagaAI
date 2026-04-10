import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  issueSessionToken,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { verifyPassword } from "@/lib/password";
// Zod validation available via @/lib/validate but login uses manual validation
// due to dual flow (password + anonymous bootstrap)
import { logError, logInfo } from "@/lib/logger";
import {
  getUserSessionProfile,
  IdentityLinkConflictError,
  normalizeEmail,
} from "@/services/user";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

type LoginBody = {
  email?: string;
  password?: string;
  name?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as LoginBody;
    const rawEmail = body.email?.trim() ?? "";

    if (!rawEmail || !isValidEmail(rawEmail)) {
      return NextResponse.json(
        { success: false, authenticated: false, error: "EMAIL_INVALID" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(rawEmail);
    const password = body.password?.trim() ?? "";

    // Password login path — bypasses session token flow
    if (password) {
      // Account lockout: check BEFORE attempting password verification
      const rl = checkRateLimit(`login-fail:${normalizedEmail}`, 5, 60_000 * 15);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "ACCOUNT_LOCKED", message: "Demasiados intentos. Espera 15 minutos." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
        );
      }

      const prisma = getPrismaClient();
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, passwordHash: true, emailVerified: true },
      });

      if (!dbUser?.passwordHash) {
        return NextResponse.json(
          { success: false, authenticated: false, error: "INVALID_CREDENTIALS" },
          { status: 401 }
        );
      }

      const ok = await verifyPassword(password, dbUser.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { success: false, authenticated: false, error: "INVALID_CREDENTIALS" },
          { status: 401 }
        );
      }

      const token = issueSessionToken(dbUser.id);
      const user = await getUserSessionProfile(dbUser.id);
      const response = NextResponse.json({
        success: true,
        authenticated: true,
        user,
        emailVerified: dbUser.emailVerified ?? false,
      });
      attachSessionCookie(response, token);
      logInfo("AUTH", "password_login", { userId: dbUser.id, emailVerified: dbUser.emailVerified });
      return response;
    }

    const identity = await resolveIdentity(req, {
      allowAnonymousBootstrap: true,
      email: normalizedEmail,
      name: body.name,
    });
    const user = await getUserSessionProfile(identity.userId);

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      userId: identity.userId,
      source: identity.source,
      token: identity.sessionToken,
      user,
    });

    if (identity.sessionToken) {
      attachSessionCookie(response, identity.sessionToken);
    }

    logInfo("CHAT", "auth_login_completed", {
      userId: identity.userId,
      source: identity.source,
      email: user.email,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "INVALID_SESSION_TOKEN",
        },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    if (error instanceof IdentityLinkConflictError) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "IDENTITY_ALREADY_LINKED",
          message:
            "Esta sesión ya está vinculada a otro email. El cambio de cuenta llegará en una fase posterior.",
        },
        { status: 409 }
      );
    }

    logError("CHAT", error, { route: "/api/auth/login", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "LOGIN_FAILED",
      },
      { status: 500 }
    );
  }
}
