import { google } from "googleapis";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { checkGAReady } from "@/services/google-analytics";
import { checkGSCReady } from "@/services/search-console";

/**
 * Sync de GA4 + Search Console al espejo local en Postgres.
 *
 * Reusa las env vars de los servicios snapshot:
 *   GOOGLE_SERVICE_ACCOUNT_JSON_B64, GA4_PROPERTY_ID, GSC_SITE_URL.
 *   Para GSC acepta también Mode A (OAuth2 refresh token).
 *
 * Idempotente: usa @@unique([date, X]) en cada tabla y upsert.
 */

/** GA4 siempre usa SA JWT (la SA fue añadida como viewer en GA4). */
function getGa4JwtClient() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!;
  const decoded = Buffer.from(b64, "base64").toString("utf-8");
  const creds = JSON.parse(decoded) as { client_email: string; private_key: string };
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
}

/**
 * GSC: Mode A (OAuth2 refresh token) si está configurado,
 * Mode B (SA JWT) como fallback — mismo patrón que search-console.ts.
 */
function getGscAuthClient() {
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim();
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim();

  if (refreshToken && clientId && clientSecret) {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  // Fallback SA JWT
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!;
  const decoded = Buffer.from(b64, "base64").toString("utf-8");
  const creds = JSON.parse(decoded) as { client_email: string; private_key: string };
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

function isoDate(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString().slice(0, 10);
}

function ga4DateToIso(s: string): string {
  // GA4 returns YYYYMMDD (sin separadores) en la dimension `date`.
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

export type SyncResult =
  | { ok: true; written: number; daysCovered: number }
  | { ok: false; error: string; reason?: string; missing?: string[] };

/** Descarga GA4 por (date, pagePath) y upserta en Ga4DailyMetric. */
export async function syncGa4DailyByPage(daysBack = 28): Promise<SyncResult> {
  const ready = checkGAReady();
  if (!ready.ready) {
    return {
      ok: false,
      error: "GA4 not configured",
      reason: ready.reason,
      missing: "missing" in ready ? ready.missing : undefined,
    };
  }

  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  const auth = getGa4JwtClient();
  const analytics = google.analyticsdata({ version: "v1beta", auth });

  try {
    const resp = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: `${daysBack}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "pagePath" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
          { name: "conversions" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
        limit: "100000",
      },
    });

    const rows = resp.data.rows ?? [];
    const prisma = getPrismaClient();
    const dates = new Set<string>();
    let written = 0;

    for (const row of rows) {
      const isoStr = ga4DateToIso(row.dimensionValues?.[0]?.value ?? "");
      const pagePath = row.dimensionValues?.[1]?.value ?? "/";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) continue;
      const date = new Date(`${isoStr}T00:00:00Z`);
      dates.add(isoStr);
      const num = (i: number) => Number(row.metricValues?.[i]?.value ?? 0);
      await prisma.ga4DailyMetric.upsert({
        where: { date_pagePath: { date, pagePath } },
        create: {
          date,
          pagePath,
          activeUsers: num(0),
          sessions: num(1),
          screenPageViews: num(2),
          eventCount: num(3),
          conversions: num(4),
          averageSessionSec: num(5),
          bounceRate: num(6),
        },
        update: {
          activeUsers: num(0),
          sessions: num(1),
          screenPageViews: num(2),
          eventCount: num(3),
          conversions: num(4),
          averageSessionSec: num(5),
          bounceRate: num(6),
          syncedAt: new Date(),
        },
      });
      written++;
    }

    logInfo("SEO_SYNC", "ga4_daily_synced", { written, daysCovered: dates.size });
    return { ok: true, written, daysCovered: dates.size };
  } catch (error) {
    logError("SEO_SYNC", error, { stage: "ga4DailyByPage" });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Descarga GSC por (date, query) y upserta en GscDailyQuery. */
export async function syncGscDailyByQuery(daysBack = 28): Promise<SyncResult> {
  const ready = checkGSCReady();
  if (!ready.ready) {
    return {
      ok: false,
      error: "GSC not configured",
      reason: ready.reason,
      missing: ready.missing,
    };
  }
  return syncGscDaily("query", daysBack);
}

/** Descarga GSC por (date, page) y upserta en GscDailyPage. */
export async function syncGscDailyByPage(daysBack = 28): Promise<SyncResult> {
  const ready = checkGSCReady();
  if (!ready.ready) {
    return {
      ok: false,
      error: "GSC not configured",
      reason: ready.reason,
      missing: ready.missing,
    };
  }
  return syncGscDaily("page", daysBack);
}

async function syncGscDaily(dim: "query" | "page", daysBack: number): Promise<SyncResult> {
  const site = process.env.GSC_SITE_URL!.trim();
  const auth = getGscAuthClient();
  const webmasters = google.webmasters({ version: "v3", auth });

  const startDate = isoDate(new Date(Date.now() - daysBack * 86_400_000));
  const endDate = isoDate(new Date());

  try {
    // Paginate — GSC limita a 25000 rows por request.
    const ROW_LIMIT = 25_000;
    let startRow = 0;
    let written = 0;
    const dates = new Set<string>();
    const prisma = getPrismaClient();

    for (let i = 0; i < 50; i++) {
      const resp = await webmasters.searchanalytics.query({
        siteUrl: site,
        requestBody: {
          startDate,
          endDate,
          dimensions: ["date", dim],
          rowLimit: ROW_LIMIT,
          startRow,
        },
      });
      const rows = resp.data.rows ?? [];
      if (rows.length === 0) break;

      for (const row of rows) {
        const isoStr = row.keys?.[0] ?? "";
        const dimValue = row.keys?.[1] ?? "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoStr) || !dimValue) continue;
        const date = new Date(`${isoStr}T00:00:00Z`);
        dates.add(isoStr);
        const data = {
          clicks: Number(row.clicks ?? 0),
          impressions: Number(row.impressions ?? 0),
          ctr: Number(row.ctr ?? 0),
          position: Number(row.position ?? 0),
        };

        if (dim === "query") {
          await prisma.gscDailyQuery.upsert({
            where: { date_query: { date, query: dimValue } },
            create: { date, query: dimValue, ...data },
            update: { ...data, syncedAt: new Date() },
          });
        } else {
          await prisma.gscDailyPage.upsert({
            where: { date_page: { date, page: dimValue } },
            create: { date, page: dimValue, ...data },
            update: { ...data, syncedAt: new Date() },
          });
        }
        written++;
      }

      if (rows.length < ROW_LIMIT) break;
      startRow += rows.length;
    }

    logInfo("SEO_SYNC", `gsc_daily_${dim}_synced`, { written, daysCovered: dates.size });
    return { ok: true, written, daysCovered: dates.size };
  } catch (error) {
    logError("SEO_SYNC", error, { stage: `gscDailyBy${dim}` });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Dispara los 3 syncs en serie. Devuelve resumen agregado. */
export async function syncAll(daysBack = 28): Promise<{
  ga4: SyncResult;
  gscQuery: SyncResult;
  gscPage: SyncResult;
}> {
  const ga4 = await syncGa4DailyByPage(daysBack);
  const gscQuery = await syncGscDailyByQuery(daysBack);
  const gscPage = await syncGscDailyByPage(daysBack);
  return { ga4, gscQuery, gscPage };
}
