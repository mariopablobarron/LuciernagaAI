import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import {
  clearAdminSessionCookie,
  normalizeAdminNextPath,
  resolveAdminAuth,
} from "@/lib/admin-auth";

// ─── i18n middleware ──────────────────────────────────────────────────────────

const intlMiddleware = createIntlMiddleware(routing);

// ─── Admin auth helpers ───────────────────────────────────────────────────────

function isAdminLoginPath(pathname: string): boolean {
  return pathname === "/admin/login";
}

function isAdminAuthApiPath(pathname: string): boolean {
  return pathname === "/api/admin/login" || pathname === "/api/admin/logout";
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Admin auth ────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (isAdminLoginPath(pathname) || isAdminAuthApiPath(pathname)) {
      return NextResponse.next();
    }

    // Auto-register endpoint: lets a Claude Code agent POST a routine after
    // /schedule using a shared secret. The handler validates X-Admin-Secret
    // in constant time; we just let the request through.
    if (
      pathname === "/api/admin/routines" &&
      request.method === "POST" &&
      request.headers.get("x-admin-secret")
    ) {
      return NextResponse.next();
    }

    // Diagnostic endpoint for the auto-register secret. Reveals only metadata
    // (length, whether quotes were peeled) — never the value itself. Public
    // so we can debug auth from outside without an admin session.
    if (pathname === "/api/admin/routines/diag" && request.method === "GET") {
      return NextResponse.next();
    }

    // Stats endpoint for the emotion-nlp shadow window. Same X-Admin-Secret
    // bypass pattern as /api/admin/routines so a remote Claude Code agent can
    // query it. The handler validates the secret in constant time.
    if (
      pathname === "/api/admin/emotion-nlp-stats" &&
      request.method === "GET" &&
      request.headers.get("x-admin-secret")
    ) {
      return NextResponse.next();
    }

    // Cron health and backup status endpoints — same X-Admin-Secret bypass
    // pattern. Allow remote auditing of cron last-run + backup recency
    // without an admin session. Each handler re-validates the secret in
    // constant time.
    if (
      (pathname === "/api/admin/cron-health" ||
        pathname === "/api/admin/backup-status") &&
      request.method === "GET" &&
      request.headers.get("x-admin-secret")
    ) {
      return NextResponse.next();
    }

    const auth = resolveAdminAuth(request);
    if (auth.authenticated) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/admin/")) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 }
      );
      if (auth.source === "invalid") {
        clearAdminSessionCookie(unauthorized);
      }
      return unauthorized;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      normalizeAdminNextPath(`${pathname}${request.nextUrl.search}`)
    );

    const redirect = NextResponse.redirect(loginUrl);
    if (auth.source === "invalid") {
      clearAdminSessionCookie(redirect);
    }
    return redirect;
  }

  // ── i18n locale routing ─────────────────────────────────────────────
  // Only apply i18n to: /, /en, /es (the landing page)
  // Everything else passes through to Next.js normally
  if (pathname === "/" || pathname === "/en" || pathname === "/es") {
    return intlMiddleware(request);
  }

  // Redirect /en/anything or /es/anything → /anything (strip locale prefix)
  const localeMatch = pathname.match(/^\/(es|en)(\/.*)/);
  if (localeMatch) {
    const url = request.nextUrl.clone();
    url.pathname = localeMatch[2];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|monitoring).*)",
  ],
};
