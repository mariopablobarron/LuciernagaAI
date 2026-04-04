import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, issueSessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword } from "@/lib/password";
import { logError, logInfo } from "@/lib/logger";
import { getUserSessionProfile, normalizeEmail } from "@/services/user";

type SignupBody = {
  email?: string;
  password?: string;
  name?: string;
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignupBody;
    const email = normalizeEmail(body.email?.trim() ?? "");
    const password = body.password?.trim() ?? "";
    const name = body.name?.trim() ?? "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "EMAIL_INVALID" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const prisma = getPrismaClient();

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (existing) {
      if (existing.passwordHash) {
        return NextResponse.json({ success: false, error: "EMAIL_TAKEN" }, { status: 409 });
      }
      // Anonymous user upgrading to full account
      const hash = await hashPassword(password);
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash: hash, name: name || undefined },
      });
      const user = await getUserSessionProfile(existing.id);
      const token = issueSessionToken(existing.id);
      const res = NextResponse.json({ success: true, user });
      attachSessionCookie(res, token);
      return res;
    }

    const hash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: { email, name: name || null, passwordHash: hash },
    });

    const user = await getUserSessionProfile(newUser.id);
    const token = issueSessionToken(newUser.id);
    const res = NextResponse.json({ success: true, user });
    attachSessionCookie(res, token);

    logInfo("AUTH", "signup_completed", { userId: newUser.id, email });
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/signup" });
    return NextResponse.json({ success: false, error: "SIGNUP_FAILED" }, { status: 500 });
  }
}
