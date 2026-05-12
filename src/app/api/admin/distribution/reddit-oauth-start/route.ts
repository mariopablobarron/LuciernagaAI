import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildAuthorizationUrl } from "@/services/discovery/reddit-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/distribution/reddit-oauth-start
 *
 * Inicia el flujo OAuth de Reddit. Genera state aleatorio, lo guarda en cookie
 * HttpOnly (verificado en el callback), y redirige a la página de autorización.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  const state = randomBytes(16).toString("hex");
  const url = buildAuthorizationUrl(state);
  if (!url) {
    return NextResponse.json(
      { error: "Reddit credentials no configurados (REDDIT_USER_CLIENT_ID/SECRET)" },
      { status: 500 },
    );
  }

  const res = NextResponse.redirect(url);
  res.cookies.set("reddit_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 min
    path: "/api/admin/distribution",
  });
  return res;
}
