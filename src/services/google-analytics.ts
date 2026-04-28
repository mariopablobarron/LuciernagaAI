import { google } from "googleapis";
import { logError } from "@/lib/logger";

/**
 * GA4 Data API client. Uses a Google Service Account (no OAuth refresh dance).
 *
 * Required env vars (set in Coolify):
 *   - GOOGLE_SERVICE_ACCOUNT_JSON_B64  Service Account JSON, base64 encoded.
 *   - GA4_PROPERTY_ID                  Numeric property ID (e.g. "123456789").
 *
 * The Service Account email needs to be added as Viewer on the GA4 property.
 */

export type GAReadyCheck =
  | { ready: true }
  | { ready: false; missing: string[]; reason: "not_configured" }
  | { ready: false; reason: "invalid_json" };

export type GA4Snapshot = {
  ok: true;
  range: { startDate: string; endDate: string };
  totals: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDurationSeconds: number;
    bounceRate: number;
    conversions: number;
  };
  topSources: Array<{ source: string; users: number; sessions: number }>;
  topPages: Array<{ path: string; views: number; avgDurationSec: number }>;
  byDay: Array<{ date: string; activeUsers: number; sessions: number }>;
};

export type GA4Failure = { ok: false; error: string; reason?: string; missing?: string[] };

function getCredentials(): { json: Record<string, unknown> } | { error: GAReadyCheck } {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const missing: string[] = [];
  if (!b64) missing.push("GOOGLE_SERVICE_ACCOUNT_JSON_B64");
  if (!propertyId) missing.push("GA4_PROPERTY_ID");
  if (missing.length > 0) {
    return { error: { ready: false, missing, reason: "not_configured" } };
  }
  try {
    const decoded = Buffer.from(b64!, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    return { json: parsed };
  } catch {
    return { error: { ready: false, reason: "invalid_json" } };
  }
}

export function checkGAReady(): GAReadyCheck {
  const result = getCredentials();
  if ("error" in result) return result.error;
  return { ready: true };
}

function getJwtClient() {
  const credsResult = getCredentials();
  if ("error" in credsResult) throw new Error("GA credentials not configured");
  const creds = credsResult.json as { client_email: string; private_key: string };
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
}

export async function getGA4Snapshot(daysBack = 7): Promise<GA4Snapshot | GA4Failure> {
  const ready = checkGAReady();
  if (!ready.ready) {
    return {
      ok: false,
      error: ready.reason === "not_configured" ? "GA4 not configured" : "GA4 credentials malformed",
      reason: ready.reason,
      missing: "missing" in ready ? ready.missing : undefined,
    };
  }

  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  const today = new Date();
  const startDate = `${daysBack}daysAgo`;
  const endDate = "today";

  try {
    const auth = getJwtClient();
    const analytics = google.analyticsdata({ version: "v1beta", auth });

    const [totalsResp, sourcesResp, pagesResp, byDayResp] = await Promise.all([
      analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "conversions" },
          ],
        },
      }),
      analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: "10",
        },
      }),
      analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: "10",
        },
      }),
      analytics.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        },
      }),
    ]);

    const totalsRow = totalsResp.data.rows?.[0]?.metricValues ?? [];
    const num = (i: number) => Number(totalsRow[i]?.value ?? 0);

    return {
      ok: true,
      range: { startDate: today.toISOString().slice(0, 10), endDate: "today" },
      totals: {
        activeUsers: num(0),
        sessions: num(1),
        screenPageViews: num(2),
        averageSessionDurationSeconds: num(3),
        bounceRate: num(4),
        conversions: num(5),
      },
      topSources: (sourcesResp.data.rows ?? []).map((r) => ({
        source: r.dimensionValues?.[0]?.value ?? "(unknown)",
        users: Number(r.metricValues?.[0]?.value ?? 0),
        sessions: Number(r.metricValues?.[1]?.value ?? 0),
      })),
      topPages: (pagesResp.data.rows ?? []).map((r) => ({
        path: r.dimensionValues?.[0]?.value ?? "(unknown)",
        views: Number(r.metricValues?.[0]?.value ?? 0),
        avgDurationSec: Number(r.metricValues?.[1]?.value ?? 0),
      })),
      byDay: (byDayResp.data.rows ?? []).map((r) => ({
        date: r.dimensionValues?.[0]?.value ?? "",
        activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
        sessions: Number(r.metricValues?.[1]?.value ?? 0),
      })),
    };
  } catch (error) {
    logError("GA4", error, { stage: "runReport" });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
