import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { buildVerificationEmail, sendUserEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/resend-verification
 *
 * Generates a new verification token and sends the email again.
 * Requires an active session (user must be logged in).
 */
export async function POST(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const userId = identity.userId;
  if (!userId) {
    return NextResponse.json({ success: false, error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const rl = checkRateLimit(`resend-verify:${userId}`, 3, 60_000 * 60); // 3 per hour
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "TOO_MANY_ATTEMPTS" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const prisma = getPrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const verifyToken = randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken, emailVerifyExpires: verifyExpires },
    });

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;

    const sent = await sendUserEmail({
      ...buildVerificationEmail({
        to: user.email,
        verifyUrl,
        name: user.name ?? undefined,
      }),
      userId: user.id,
      template: "verification",
    });

    if (!sent) {
      logError("AUTH", new Error("sendUserEmail returned false"), {
        route: "/api/auth/resend-verification",
        email: user.email,
      });
      return NextResponse.json(
        { success: false, error: "EMAIL_SEND_FAILED" },
        { status: 502 },
      );
    }

    logInfo("AUTH", "verification_email_resent", { userId: user.id, email: user.email });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/resend-verification" });
    return NextResponse.json({ success: false, error: "RESEND_FAILED" }, { status: 500 });
  }
}
