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
  // Skip i18n for app routes, api, static files
  const skipI18n =
    pathname.startsWith("/app") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/impulso") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/journey") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/family") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/org") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".");

  if (skipI18n) return NextResponse.next();

  // Pages that have i18n versions under [locale]/
  const i18nPages = ["/"];

  // Check if this is a locale-prefixed URL for a page that doesn't have i18n
  const localeMatch = pathname.match(/^\/(es|en)(\/.*)?$/);
  if (localeMatch) {
    const subpath = localeMatch[2] || "/";
    if (!i18nPages.includes(subpath)) {
      // Redirect /en/unirse → /unirse (strip locale prefix)
      const url = request.nextUrl.clone();
      url.pathname = subpath;
      return NextResponse.redirect(url);
    }
  }

  // Apply i18n middleware only to root and locale-prefixed root
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|monitoring).*)",
  ],
};
