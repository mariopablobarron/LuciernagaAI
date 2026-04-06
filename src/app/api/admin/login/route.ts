import { NextRequest, NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  issueAdminSessionToken,
  normalizeAdminNextPath,
  resolveAdminAuth,
  validateAdminCredentials,
} from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = checkRateLimit(`admin-login:${ip}`, 5, 60_000 * 15); // 5 intentos / 15 min
    if (!rl.allowed) {
      logInfo("AUTH", "admin_login_rate_limited", { ip });
      return NextResponse.json(
        { ok: false, error: "TOO_MANY_ATTEMPTS" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = (await req.json()) as AdminLoginBody;
    const username = body.username?.trim() ?? "";
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
