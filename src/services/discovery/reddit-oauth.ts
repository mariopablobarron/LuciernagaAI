/**
 * Reddit OAuth user flow — para publicar comentarios con la cuenta de Mario.
 *
 * Flujo:
 *   1. /admin/distribution → "Conectar Reddit" → GET /api/admin/distribution/reddit-oauth-start
 *      Genera state, guarda en cookie, redirect a Reddit
 *   2. Mario aprueba → Reddit redirige a /api/admin/distribution/reddit-oauth-callback
 *      ?code=X&state=Y
 *   3. Backend intercambia code por (access_token, refresh_token), guarda en
 *      IntegrationToken (singleton por plataforma)
 *   4. Para postear: getValidAccessToken() refresca si está caducado
 *
 * Scopes requeridos:
 *   - identity   → /me (verificar conexión, obtener username)
 *   - submit     → publicar comentarios
 *   - read       → leer threads (info del post para validar antes de comentar)
 *
 * Setup app Reddit:
 *   - Tipo: **web app** (no script — script no soporta el flow de redirect)
 *   - Redirect URI: https://tresmilmillonesdelatidos.es/api/admin/distribution/reddit-oauth-callback
 *
 * Si solo tienes la app tipo "script" de Fase 2 (read-only),
 * crea otra de tipo "web app" — pueden coexistir, los discovery searches
 * siguen usando la script.
 */

import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo, logWarn } from "@/lib/logger";

const REDDIT_AUTH_BASE = "https://www.reddit.com/api/v1";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const UA = "TresMilMillonesDeLatidos-Discovery/1.0 (by /u/luciernaga-ai; contact mario@startidea.es)";

const SCOPES = ["identity", "submit", "read"].join(" ");

export function getClientCredentials():
  | { clientId: string; clientSecret: string; redirectUri: string }
  | null {
  // Reuse the Fase 2 vars if the user setup web app type with same credentials,
  // or use dedicated USER vars for clarity. Prefer USER vars.
  const clientId =
    process.env.REDDIT_USER_CLIENT_ID?.trim() || process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret =
    process.env.REDDIT_USER_CLIENT_SECRET?.trim() || process.env.REDDIT_CLIENT_SECRET?.trim();
  const appUrl = process.env.APP_BASE_URL?.trim() || "https://tresmilmillonesdelatidos.es";
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/admin/distribution/reddit-oauth-callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function buildAuthorizationUrl(state: string): string | null {
  const creds = getClientCredentials();
  if (!creds) return null;
  const url = new URL(`${REDDIT_AUTH_BASE}/authorize`);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", creds.redirectUri);
  url.searchParams.set("duration", "permanent");
  url.searchParams.set("scope", SCOPES);
  return url.toString();
}

type RedditTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeCodeForToken(code: string): Promise<RedditTokenResponse | null> {
  const creds = getClientCredentials();
  if (!creds) return null;
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: creds.redirectUri,
  });
  try {
    const res = await fetch(`${REDDIT_AUTH_BASE}/access_token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logError("DISCOVERY", new Error(`Reddit token exchange ${res.status}: ${text.slice(0, 200)}`), {
        stage: "oauth_exchange",
      });
      return null;
    }
    return (await res.json()) as RedditTokenResponse;
  } catch (e) {
    logError("DISCOVERY", e, { stage: "oauth_exchange" });
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<RedditTokenResponse | null> {
  const creds = getClientCredentials();
  if (!creds) return null;
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  try {
    const res = await fetch(`${REDDIT_AUTH_BASE}/access_token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logWarn("DISCOVERY", "reddit_refresh_error", { status: res.status, body: text.slice(0, 200) });
      return null;
    }
    return (await res.json()) as RedditTokenResponse;
  } catch (e) {
    logError("DISCOVERY", e, { stage: "oauth_refresh" });
    return null;
  }
}

export async function fetchRedditUsername(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string };
    return json.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Persiste un token (UPSERT). Llamado tras exchange y tras refresh.
 */
export async function saveRedditToken(args: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
  scope?: string;
  username?: string | null;
}): Promise<void> {
  const prisma = getPrismaClient();
  const expiresAt = args.expiresIn ? new Date(Date.now() + (args.expiresIn - 60) * 1000) : null;
  await prisma.integrationToken.upsert({
    where: { platform: "reddit" },
    create: {
      platform: "reddit",
      accessToken: args.accessToken,
      refreshToken: args.refreshToken ?? null,
      expiresAt,
      scope: args.scope ?? null,
      username: args.username ?? null,
    },
    update: {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken ?? undefined, // si viene null, NO sobrescribir el que ya hay
      expiresAt,
      scope: args.scope ?? null,
      username: args.username ?? undefined,
    },
  });
  logInfo("DISCOVERY", "reddit_token_saved", { username: args.username });
}

/**
 * Devuelve un access_token válido. Refresca si está caducado.
 * Devuelve null si no hay token o el refresh falla.
 */
export async function getValidAccessToken(): Promise<
  { accessToken: string; username: string | null } | null
> {
  const prisma = getPrismaClient();
  const row = await prisma.integrationToken.findUnique({ where: { platform: "reddit" } });
  if (!row) return null;

  const expired = row.expiresAt && row.expiresAt.getTime() <= Date.now();
  if (!expired) {
    return { accessToken: row.accessToken, username: row.username };
  }

  if (!row.refreshToken) {
    logWarn("DISCOVERY", "reddit_token_expired_no_refresh", {});
    return null;
  }

  const refreshed = await refreshAccessToken(row.refreshToken);
  if (!refreshed?.access_token) return null;

  await saveRedditToken({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? null,
    expiresIn: refreshed.expires_in,
    scope: refreshed.scope,
    username: row.username,
  });
  return { accessToken: refreshed.access_token, username: row.username };
}

/**
 * Estado de conexión para mostrar en UI.
 */
export async function getRedditConnectionStatus(): Promise<{
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  hasCredentials: boolean;
}> {
  const hasCredentials = !!getClientCredentials();
  const prisma = getPrismaClient();
  const row = await prisma.integrationToken.findUnique({
    where: { platform: "reddit" },
    select: { username: true, expiresAt: true, refreshToken: true },
  });
  return {
    connected: !!(row && row.refreshToken),
    username: row?.username ?? null,
    expiresAt: row?.expiresAt?.toISOString() ?? null,
    hasCredentials,
  };
}

/**
 * Publica un comentario en un thread.
 * `parentFullname` debe ser el fullname del post (e.g. "t3_abc123") o de un
 * comentario padre ("t1_xyz789").
 */
export async function postRedditComment(args: {
  parentFullname: string;
  text: string;
}): Promise<{ ok: true; url: string; commentId: string } | { ok: false; error: string }> {
  const auth = await getValidAccessToken();
  if (!auth) return { ok: false, error: "no_valid_token" };

  try {
    const form = new URLSearchParams({
      api_type: "json",
      thing_id: args.parentFullname,
      text: args.text,
    });
    const res = await fetch(`${REDDIT_API_BASE}/api/comment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Reddit ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      json?: {
        errors?: Array<[string, string]>;
        data?: { things?: Array<{ data?: { id?: string; permalink?: string; name?: string } }> };
      };
    };

    if (json.json?.errors && json.json.errors.length > 0) {
      const errs = json.json.errors.map((e) => e.join(":")).join("; ");
      return { ok: false, error: `Reddit API: ${errs}` };
    }

    const created = json.json?.data?.things?.[0]?.data;
    if (!created?.permalink || !created.id) {
      return { ok: false, error: "Reddit response missing permalink/id" };
    }
    return {
      ok: true,
      url: `https://www.reddit.com${created.permalink}`,
      commentId: created.name ?? `t1_${created.id}`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "exception" };
  }
}
