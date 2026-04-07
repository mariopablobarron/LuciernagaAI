import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Verifies the user's email address using the token sent during signup.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ success: false, error: "MISSING_TOKEN" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  try {
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
      select: { id: true, email: true, emailVerified: true, emailVerifyExpires: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
      return NextResponse.json({ success: false, error: "TOKEN_EXPIRED" }, { status: 410 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    logInfo("AUTH", "email_verified", { userId: user.id, email: user.email });

    // Redirect to app with success message
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/login?verified=1`);
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/verify-email" });
    return NextResponse.json({ success: false, error: "VERIFICATION_FAILED" }, { status: 500 });
  }
}
