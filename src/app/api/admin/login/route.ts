import { NextRequest, NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  issueAdminSessionToken,
  normalizeAdminNextPath,
  resolveAdminAuth,
  validateEnvCredentials,
} from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { verifyPassword } from "@/lib/password";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { SystemRole } from "@prisma/client";

type AdminLoginBody = {
  username?: string;
  password?: string;
  next?: string;
};

export async function GET(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  return NextResponse.json({
    authenticated: auth.authenticated,
    source: auth.source,
    role: auth.role ?? null,
    adminName: auth.adminName ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = (await req.json()) as AdminLoginBody;
    const username = body.username?.trim() ?? "";

    // Rate-limit by username (per-account lockout)
    const rl = checkRateLimit(`login-fail:admin:${username}`, 5, 60_000 * 15);
    if (!rl.allowed) {
      logInfo("AUTH", "admin_login_rate_limited", { username });
      return NextResponse.json(
        { ok: false, error: "ACCOUNT_LOCKED", message: "Demasiados intentos. Espera 15 minutos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }
    const password = body.password ?? "";
    const nextPath = normalizeAdminNextPath(body.next);

    // 1. Try DB-based AdminUser (email or name match)
    const prisma = getPrismaClient();
    const adminUser = await prisma.adminUser.findFirst({
      where: {
        isActive: true,
        OR: [{ email: username }, { name: username }],
      },
    });

    if (adminUser) {
      const passwordValid = await verifyPassword(password, adminUser.passwordHash);
      if (passwordValid) {
        // Update last login
        await prisma.adminUser.update({
          where: { id: adminUser.id },
          data: { lastLoginAt: new Date() },
        });

        const token = issueAdminSessionToken({
          adminId: adminUser.id,
          username: adminUser.name,
          role: adminUser.role,
        });
        const response = NextResponse.json({ ok: true, next: nextPath, role: adminUser.role });
        attachAdminSessionCookie(response, token);
        logInfo("AUTH", "admin_login_success", { username: adminUser.name, role: adminUser.role, source: "db" });
        return response;
      }

      // DB user found but wrong password
      logInfo("AUTH", "admin_login_failed", { username, ip, source: "db" });
      return NextResponse.json({ ok: false, error: "INVALID_ADMIN_CREDENTIALS" }, { status: 401 });
    }

    // 2. Fallback to env-var credentials (legacy superadmin)
    if (validateEnvCredentials(username, password)) {
      const token = issueAdminSessionToken({
        adminId: "env",
        username,
        role: "superadmin" as SystemRole,
      });
      const response = NextResponse.json({ ok: true, next: nextPath, role: "superadmin" });
      attachAdminSessionCookie(response, token);
      logInfo("AUTH", "admin_login_success", { username, role: "superadmin", source: "env" });
      return response;
    }

    logInfo("AUTH", "admin_login_failed", { username, ip, source: "none" });
    return NextResponse.json({ ok: false, error: "INVALID_ADMIN_CREDENTIALS" }, { status: 401 });
  } catch (error: unknown) {
    logError("AUTH", error, { route: "/api/admin/login" });
    return NextResponse.json({ ok: false, error: "ADMIN_LOGIN_FAILED" }, { status: 500 });
  }
}
