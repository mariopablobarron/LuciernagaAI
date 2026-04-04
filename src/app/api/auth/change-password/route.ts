import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { current?: string; next?: string };
    const current = body.current?.trim() ?? "";
    const next = body.next?.trim() ?? "";

    if (!next || next.length < 8) {
      return NextResponse.json({ success: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { passwordHash: true },
    });

    if (user?.passwordHash) {
      if (!current) {
        return NextResponse.json({ success: false, error: "CURRENT_REQUIRED" }, { status: 400 });
      }
      const ok = await verifyPassword(current, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ success: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
      }
    }

    const hash = await hashPassword(next);
    await prisma.user.update({ where: { id: identity.userId }, data: { passwordHash: hash } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/change-password" });
    return NextResponse.json({ success: false, error: "CHANGE_FAILED" }, { status: 500 });
  }
}
