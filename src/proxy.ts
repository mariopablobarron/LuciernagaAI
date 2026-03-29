import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  normalizeAdminNextPath,
  resolveAdminAuth,
} from "@/lib/admin-auth";

function isAdminLoginPath(pathname: string): boolean {
  return pathname === "/admin/login";
}

function isAdminAuthApiPath(pathname: string): boolean {
  return pathname === "/api/admin/login" || pathname === "/api/admin/logout";
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
