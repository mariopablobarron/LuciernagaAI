import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { exchangeCodeForToken, fetchRedditUsername, saveRedditToken } from "@/services/discovery/reddit-oauth";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/distribution/reddit-oauth-callback?code=X&state=Y
 *
 * Reddit redirige aquí tras autorización. Validamos state contra la cookie,
 * intercambiamos code por (access_token, refresh_token), obtenemos el username
 * y persistimos en IntegrationToken.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    logError("DISCOVERY", new Error(`Reddit denied OAuth: ${error}`), { stage: "callback_user_denied" });
    return NextResponse.redirect(new URL("/admin/distribution?reddit=denied", req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("reddit_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    logError("DISCOVERY", new Error("OAuth state mismatch or missing code"), { stage: "callback_state" });
    return NextResponse.redirect(new URL("/admin/distribution?reddit=state_error", req.nextUrl.origin));
  }

  const token = await exchangeCodeForToken(code);
  if (!token?.access_token) {
    return NextResponse.redirect(new URL("/admin/distribution?reddit=exchange_failed", req.nextUrl.origin));
  }

  const username = await fetchRedditUsername(token.access_token);

  await saveRedditToken({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresIn: token.expires_in,
    scope: token.scope,
    username,
  });

  logInfo("DISCOVERY", "reddit_oauth_complete", { username });

  const res = NextResponse.redirect(new URL("/admin/distribution?reddit=connected", req.nextUrl.origin));
  res.cookies.delete("reddit_oauth_state");
  return res;
}
