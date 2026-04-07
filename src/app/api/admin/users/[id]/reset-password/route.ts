import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const POST = withRateLimit(
  async function POST(req: NextRequest, ctx: unknown) {
    try {
      const adminAuth = resolveAdminAuth(req);
      if (!adminAuth.authenticated) {
        const unauthorized = NextResponse.json(
          { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
          { status: 401 },
        );
        if (adminAuth.source === "invalid") clearAdminSessionCookie(unauthorized);
        return unauthorized;
      }

      const { id } = await (ctx as Params).params;
      if (!id) {
        return NextResponse.json(
          { error: "INVALID_USER_ID", message: "User id is required." },
          { status: 400 },
        );
      }

      const body = (await req.json()) as { newPassword?: string };
      const { newPassword } = body;

      if (!newPassword || typeof newPassword !== "string") {
        return NextResponse.json(
          { error: "MISSING_PASSWORD", message: "newPassword is required." },
          { status: 400 },
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "PASSWORD_TOO_SHORT", message: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!user) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND", message: "No existe ese usuario." },
          { status: 404 },
        );
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      logInfo("ADMIN", "password_reset_by_admin", { userId: id });

      return NextResponse.json({ success: true, userId: id });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "POST /api/admin/users/[id]/reset-password" });
      return NextResponse.json(
        { error: "PASSWORD_RESET_FAILED", message: "No se pudo restablecer la contraseña." },
        { status: 500 },
      );
    }
  },
  { limit: 10 },
);
