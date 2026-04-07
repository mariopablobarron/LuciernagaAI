import { NextRequest, NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  issueAdminSessionToken,
  normalizeAdminNextPath,
  resolveAdminAuth,
  validateAdminCredentials,
} from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

type AdminLoginBody = {
  username?: string;
  password?: string;
  next?: string;
};

export async function GET(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  return NextResponse.json({ authenticated: auth.authenticated, source: auth.source });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = (await req.json()) as AdminLoginBody;
    const username = body.username?.trim() ?? "";

    // Rate-limit by username (per-account lockout) instead of only by IP
    const rl = checkRateLimit(`login-fail:admin:${username}`, 5, 60_000 * 15);
    if (!rl.allowed) {
      logInfo("AUTH", "admin_login_rate_limited", { username });
      return NextResponse.json(
        { ok: false, error: "ACCOUNT_LOCKED", message: "Demasiados intentos. Espera 15 minutos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }
    const password = body.password ?? "";
    const nextPath = normalizeAdminNextPath(body.next);

    if (!validateAdminCredentials(username, password)) {
      logInfo("AUTH", "admin_login_failed", { username, ip });
      return NextResponse.json(
        { ok: false, error: "INVALID_ADMIN_CREDENTIALS" },
        { status: 401 }
      );
    }

    const token = issueAdminSessionToken();
    const response = NextResponse.json({ ok: true, next: nextPath });
    attachAdminSessionCookie(response, token);
    logInfo("AUTH", "admin_login_success", { username });

    return response;
  } catch (error: unknown) {
    logError("AUTH", error, { route: "/api/admin/login" });
    return NextResponse.json(
      { ok: false, error: "ADMIN_LOGIN_FAILED" },
      { status: 500 }
    );
  }
}
