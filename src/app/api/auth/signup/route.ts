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
        await tx.user.update({
          where: { id: existing.id },
          data: { passwordHash: hash, name: name || undefined },
        });
        return { status: "UPGRADED" as const, userId: existing.id };
      }

      const newUser = await tx.user.create({
        data: { email, name: name || null, passwordHash: hash },
      });
      return { status: "CREATED" as const, userId: newUser.id };
    });

    if (result.status === "EMAIL_TAKEN") {
      return NextResponse.json({ success: false, error: "EMAIL_TAKEN" }, { status: 409 });
    }

    const user = await getUserSessionProfile(result.userId);
    const token = issueSessionToken(result.userId);
    const res = NextResponse.json({ success: true, user });
    attachSessionCookie(res, token);

    if (result.status === "CREATED") {
      logInfo("AUTH", "signup_completed", { userId: result.userId, email });
    }
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/signup" });
    return NextResponse.json({ success: false, error: "SIGNUP_FAILED" }, { status: 500 });
  }
}
