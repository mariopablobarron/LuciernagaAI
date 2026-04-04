import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, issueSessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/lib/reset-token";
import { logError } from "@/lib/logger";
import { getUserSessionProfile } from "@/services/user";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; password?: string };
    const raw = body.token?.trim() ?? "";
    const password = body.password?.trim() ?? "";

    if (!raw) {
      return NextResponse.json({ success: false, error: "TOKEN_REQUIRED" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const tokenHash = hashResetToken(raw);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 400 });
    }
    if (record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "EXPIRED_TOKEN" }, { status: 400 });
    }

    const hash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    const token = issueSessionToken(record.userId);
    const user = await getUserSessionProfile(record.userId);
    const res = NextResponse.json({ success: true, user });
    attachSessionCookie(res, token);
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/reset-password" });
    return NextResponse.json({ success: false, error: "RESET_FAILED" }, { status: 500 });
  }
}
