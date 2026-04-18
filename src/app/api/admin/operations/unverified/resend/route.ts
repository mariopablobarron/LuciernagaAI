import { randomBytes } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { buildVerificationEmail, sendUserEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type ResendResult = {
  userId: string;
  email: string;
  status: "sent" | "already_verified" | "user_not_found" | "send_failed";
};

async function resendOne(
  userId: string,
  baseUrl: string,
): Promise<ResendResult> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      passwordHash: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    return { userId, email: "", status: "user_not_found" };
  }
  if (user.emailVerified) {
    return { userId, email: user.email, status: "already_verified" };
  }

  const verifyToken = randomBytes(32).toString("hex");
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: verifyToken, emailVerifyExpires: verifyExpires },
  });

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
    return { userId: user.id, email: user.email, status: "send_failed" };
  }

  logInfo("AUTH", "verification_email_resent_by_admin", {
    userId: user.id,
    email: user.email,
  });

  return { userId: user.id, email: user.email, status: "sent" };
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    const all: boolean = body?.all === true;

    if (!userId && !all) {
      return NextResponse.json(
        { error: "INVALID_BODY", hint: "Provide userId or all=true" },
        { status: 400 },
      );
    }

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const prisma = getPrismaClient();

    if (all) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ids = await prisma.user.findMany({
        where: {
          emailVerified: false,
          passwordHash: { not: null },
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
        select: { id: true },
      });

      const results: ResendResult[] = [];
      for (const row of ids) {
        try {
          results.push(await resendOne(row.id, baseUrl));
        } catch (e) {
          logError("ADMIN_OPS_UNVERIFIED_RESEND", e, { userId: row.id });
          results.push({ userId: row.id, email: "", status: "send_failed" });
        }
      }

      return NextResponse.json({
        ok: true,
        mode: "all",
        attempted: results.length,
        results,
      });
    }

    const one = await resendOne(userId!, baseUrl);
    const httpStatus =
      one.status === "sent" || one.status === "already_verified" ? 200 : 502;
    return NextResponse.json(
      { ok: one.status === "sent", ...one },
      { status: httpStatus },
    );
  } catch (err) {
    logError("ADMIN_OPS_UNVERIFIED_RESEND", err, {
      route: "/api/admin/operations/unverified/resend",
    });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
