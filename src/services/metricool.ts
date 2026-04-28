import { logError } from "@/lib/logger";

/**
 * Metricool API client.
 *
 * Metricool's documented API:
 *   https://api.metricool.com/v2  (auth: query params userId + userToken)
 *
 * Required env vars (set in Coolify):
 *   - METRICOOL_USER_ID     Numeric user ID.
 *   - METRICOOL_USER_TOKEN  Long-lived API token from Settings → API.
 *   - METRICOOL_BLOG_ID     Numeric ID of the connected brand/blog.
 *
 * Requires a paid Metricool plan (Advanced+) to enable the API.
 */

const API_BASE = "https://api.metricool.com/v2";

export type MetricoolSnapshot = {
  ok: true;
  range: { startDate: string; endDate: string };
  networks: Array<{
    network: string; // "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok" | "youtube"
    followers: number;
    engagement: number;
    posts: number;
    impressions: number;
  }>;
};

export type MetricoolFailure = { ok: false; error: string; reason?: string; missing?: string[] };

export function checkMetricoolReady():
  | { ready: true }
  | { ready: false; reason: "not_configured"; missing: string[] } {
  const userId = process.env.METRICOOL_USER_ID?.trim();
  const userToken = process.env.METRICOOL_USER_TOKEN?.trim();
  const blogId = process.env.METRICOOL_BLOG_ID?.trim();
  const missing: string[] = [];
  if (!userId) missing.push("METRICOOL_USER_ID");
  if (!userToken) missing.push("METRICOOL_USER_TOKEN");
  if (!blogId) missing.push("METRICOOL_BLOG_ID");
  if (missing.length > 0) return { ready: false, reason: "not_configured", missing };
  return { ready: true };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchNetwork(
  network: string,
  startDate: string,
  endDate: string,
): Promise<{ followers: number; engagement: number; posts: number; impressions: number }> {
  const userId = process.env.METRICOOL_USER_ID!.trim();
  const userToken = process.env.METRICOOL_USER_TOKEN!.trim();
  const blogId = process.env.METRICOOL_BLOG_ID!.trim();

  const params = new URLSearchParams({
    blogId,
    userId,
    userToken,
    start: startDate,
    end: endDate,
  });

  // Metricool's analytics endpoint returns a payload per network. The exact
  // schema varies; we extract conservatively and fall back to 0.
  const url = `${API_BASE}/analytics/posts/${network}?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Metricool ${network} HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    summary?: {
      followers?: number;
      engagement?: number;
      posts?: number;
      impressions?: number;
    };
  };
  return {
    followers: data.summary?.followers ?? 0,
    engagement: data.summary?.engagement ?? 0,
    posts: data.summary?.posts ?? 0,
    impressions: data.summary?.impressions ?? 0,
  };
}

export async function getMetricoolSnapshot(
  daysBack = 7,
): Promise<MetricoolSnapshot | MetricoolFailure> {
  const ready = checkMetricoolReady();
  if (!ready.ready) {
    return {
      ok: false,
      error: "Metricool not configured",
      reason: ready.reason,
      missing: ready.missing,
    };
  }

  const startDate = isoDaysAgo(daysBack);
  const endDate = isoDaysAgo(0);

  // Try each network independently — one failing should not kill all metrics.
  const networks = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"];
  const results = await Promise.allSettled(
    networks.map(async (n) => ({ network: n, ...(await fetchNetwork(n, startDate, endDate)) })),
  );

  const out: MetricoolSnapshot["networks"] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      out.push(r.value);
    } else {
      logError("METRICOOL", r.reason, { stage: "fetchNetwork" });
    }
  }

  if (out.length === 0) {
    return { ok: false, error: "All Metricool network requests failed" };
  }

  return {
    ok: true,
    range: { startDate, endDate },
    networks: out,
  };
}
