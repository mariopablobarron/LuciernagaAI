import { google } from "googleapis";
import { logError } from "@/lib/logger";

/**
 * Google Search Console API client.
 *
 * Required env vars:
 *   - GSC_SITE_URL  Either "https://tresmilmillonesdelatidos.es/"
 *                   or "sc-domain:tresmilmillonesdelatidos.es"
 *
 * Authentication — one of two modes (OAuth2 preferred, SA fallback):
 *
 * Mode A — OAuth2 user token (recommended, works without GSC user management API):
 *   - GSC_OAUTH_REFRESH_TOKEN   Refresh token from Mario's Google account.
 *   - GSC_OAUTH_CLIENT_ID       OAuth2 Desktop client ID.
 *   - GSC_OAUTH_CLIENT_SECRET   OAuth2 Desktop client secret.
 *   Note: refresh tokens expire in 7 days if the GCP OAuth app is in "Test" mode.
 *   Regenerate with: python3 ~/Documents/grant_gsc_v2.py
 *
 * Mode B — Service Account JWT (only works if SA is added as GSC user):
 *   - GOOGLE_SERVICE_ACCOUNT_JSON_B64  Same Service Account as GA4.
 *   GSC does not support adding SA emails as users via API; requires manual UI step.
 */

export type GSCSnapshot = {
  ok: true;
  site: string;
  range: { startDate: string; endDate: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
};

export type GSCFailure = { ok: false; error: string; reason?: string; missing?: string[] };

export function checkGSCReady():
  | { ready: true }
  | { ready: false; reason: "not_configured"; missing: string[] } {
  const site = process.env.GSC_SITE_URL?.trim();
  const missing: string[] = [];
  if (!site) missing.push("GSC_SITE_URL");

  // Mode A: OAuth2 user token
  const hasOAuth =
    process.env.GSC_OAUTH_REFRESH_TOKEN?.trim() &&
    process.env.GSC_OAUTH_CLIENT_ID?.trim() &&
    process.env.GSC_OAUTH_CLIENT_SECRET?.trim();

  // Mode B: Service Account JWT
  const hasSA = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();

  if (!hasOAuth && !hasSA) {
    missing.push("GSC_OAUTH_REFRESH_TOKEN+GSC_OAUTH_CLIENT_ID+GSC_OAUTH_CLIENT_SECRET (or GOOGLE_SERVICE_ACCOUNT_JSON_B64)");
  }

  if (missing.length > 0) return { ready: false, reason: "not_configured", missing };
  return { ready: true };
}

function getAuthClient() {
  // Mode A: OAuth2 user credentials (preferred — avoids GSC user management API)
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim();
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim();

  if (refreshToken && clientId && clientSecret) {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  // Mode B: Service Account JWT fallback
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!;
  const decoded = Buffer.from(b64, "base64").toString("utf-8");
  const creds = JSON.parse(decoded) as { client_email: string; private_key: string };
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getSearchConsoleSnapshot(daysBack = 28): Promise<GSCSnapshot | GSCFailure> {
  const ready = checkGSCReady();
  if (!ready.ready) {
    return {
      ok: false,
      error: "Search Console not configured",
      reason: ready.reason,
      missing: ready.missing,
    };
  }

  const site = process.env.GSC_SITE_URL!.trim();
  const startDate = isoDaysAgo(daysBack);
  const endDate = isoDaysAgo(0);

  try {
    const auth = getAuthClient();
    const webmasters = google.webmasters({ version: "v3", auth });

    const [totalsResp, queriesResp, pagesResp] = await Promise.all([
      webmasters.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate, endDate, rowLimit: 1 },
      }),
      webmasters.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate, endDate, dimensions: ["query"], rowLimit: 10 },
      }),
      webmasters.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate, endDate, dimensions: ["page"], rowLimit: 10 },
      }),
    ]);

    const t = totalsResp.data.rows?.[0];

    return {
      ok: true,
      site,
      range: { startDate, endDate },
      totals: {
        clicks: t?.clicks ?? 0,
        impressions: t?.impressions ?? 0,
        ctr: t?.ctr ?? 0,
        position: t?.position ?? 0,
      },
      topQueries: (queriesResp.data.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      })),
      topPages: (pagesResp.data.rows ?? []).map((r) => ({
        page: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
      })),
    };
  } catch (error) {
    logError("GSC", error, { stage: "searchanalytics" });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
