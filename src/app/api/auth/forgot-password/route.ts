import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { generateResetToken, resetTokenExpiry } from "@/lib/reset-token";
import { sendUserEmail, buildPasswordResetEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/services/user";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = checkRateLimit(`forgot-pwd:${ip}`, 3, 60_000 * 15); // 3 requests/15min per IP
    if (!rl.allowed) {
      return NextResponse.json(
        { success: true }, // always return success to avoid enumeration
        { status: 200, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = (await req.json()) as { email?: string };
    const email = normalizeEmail(body.email?.trim() ?? "");

    if (!email) {
      return NextResponse.json({ success: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const { raw, hash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: resetTokenExpiry(),
      },
    });

    const appUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${raw}`;

    await sendUserEmail({
      ...buildPasswordResetEmail({ to: email, resetUrl, name: user.name }),
      userId: user.id,
      template: "password_reset",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/forgot-password" });
    return NextResponse.json({ success: false, error: "FORGOT_FAILED" }, { status: 500 });
  }
}
