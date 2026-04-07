import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, issueSessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword } from "@/lib/password";
import { logError, logInfo } from "@/lib/logger";
import { getUserSessionProfile, normalizeEmail } from "@/services/user";
import { sendUserEmail, buildVerificationEmail, buildWelcomeEmail } from "@/lib/email";
import { issueWebLinkToken } from "@/lib/telegram-link";
import { sendAlert } from "@/lib/alerts";
import { validateOrigin } from "@/lib/csrf";

type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

type SignupBody = {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  utm?: UtmParams;
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as SignupBody;
    const email = normalizeEmail(body.email?.trim() ?? "");
    const password = body.password?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const phone = body.phone?.trim() || null;
    const utmSource = body.utm && Object.keys(body.utm).length > 0
      ? JSON.stringify(body.utm)
      : null;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "EMAIL_INVALID" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const prisma = getPrismaClient();

    // Hash password before the transaction to minimise time spent holding the lock
    const hash = await hashPassword(password);

    // Use a serializable transaction to prevent the race between findUnique and create/update.
    // Two concurrent signups with the same email could both pass the check and then both try to
    // create, violating the unique constraint.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });

      if (existing) {
        if (existing.passwordHash) {
          return { status: "EMAIL_TAKEN" as const };
        }
        // Anonymous user upgrading to full account
        const verifyToken = randomBytes(32).toString("hex");
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await tx.user.update({
          where: { id: existing.id },
          data: {
            passwordHash: hash,
            name: name || undefined,
            phone,
            emailVerifyToken: verifyToken,
            emailVerifyExpires: verifyExpires,
          },
        });
        return { status: "UPGRADED" as const, userId: existing.id, verifyToken };
      }

      const verifyToken = randomBytes(32).toString("hex");
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const newUser = await tx.user.create({
        data: {
          email,
          name: name || null,
          phone,
          passwordHash: hash,
          emailVerifyToken: verifyToken,
          emailVerifyExpires: verifyExpires,
          source: utmSource,
        },
      });
      return { status: "CREATED" as const, userId: newUser.id, verifyToken };
    });

    if (result.status === "EMAIL_TAKEN") {
      return NextResponse.json({ success: false, error: "EMAIL_TAKEN" }, { status: 409 });
    }

    const user = await getUserSessionProfile(result.userId);
    const token = issueSessionToken(result.userId);

    // Build Telegram deep link for account linking
    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
    let telegramLink: string | undefined;
    if (botUsername) {
      const linkToken = issueWebLinkToken(result.userId);
      telegramLink = `https://t.me/${botUsername}?start=link_${linkToken}`;
    }

    const res = NextResponse.json({ success: true, user, telegramLink });
    attachSessionCookie(res, token);

    if (result.status === "CREATED") {
      logInfo("AUTH", "signup_completed", { userId: result.userId, email });
      sendAlert({
        type: "info",
        title: "Nuevo usuario registrado",
        message: `${name || "Sin nombre"} (${email})${phone ? ` — Tel: ${phone}` : ""}`,
      }).catch(() => {});
    }

    // Send verification + welcome emails for new and upgraded users
    if ("verifyToken" in result) {
      const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
      const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${result.verifyToken}`;
      sendUserEmail(buildVerificationEmail({ to: email, verifyUrl, name: name || undefined })).catch(
        (e) => logError("AUTH", e, { action: "send_verification_email", email }),
      );
      const welcomeEmail = buildWelcomeEmail({ name: name || null, appUrl: baseUrl });
      sendUserEmail({ to: email, ...welcomeEmail }).catch(
        (e) => logError("AUTH", e, { action: "send_welcome_email", email }),
      );
    }
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/signup" });
    return NextResponse.json({ success: false, error: "SIGNUP_FAILED" }, { status: 500 });
  }
}
