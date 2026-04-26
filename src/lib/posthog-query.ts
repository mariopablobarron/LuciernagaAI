/**
 * Cliente mínimo para la PostHog Query API (HogQL).
 *
 * Requiere 3 env vars:
 *   POSTHOG_API_HOST          ej: https://eu.posthog.com
 *   POSTHOG_PROJECT_ID        ej: 12345 (visible en Settings → Project)
 *   POSTHOG_PERSONAL_API_KEY  Personal API Key creada en Settings → User → Personal API Keys
 *                              Scope mínimo: query:read
 *
 * Si falta cualquiera, las funciones devuelven null sin lanzar — el endpoint
 * que las consume deberá responder con un mensaje claro al admin.
 */

export type Range = "7d" | "30d" | "90d";

export type UtmRow = {
  source: string;
  medium: string;
  campaign: string;
  visitors: number;
  pageviews: number;
};

export type UtmDailyRow = {
  day: string; // YYYY-MM-DD
  visitors: number;
  pageviews: number;
};

export type PosthogConfig = { host: string; projectId: string; apiKey: string };

export function getPosthogConfig(): PosthogConfig | null {
  const host = process.env.POSTHOG_API_HOST?.trim() || process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || null;
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim() || null;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim() || null;
  if (!host || !projectId || !apiKey) return null;
  return { host: host.replace(/\/$/, ""), projectId, apiKey };
}

async function runHogQL<T>(cfg: PosthogConfig, query: string): Promise<T[] | null> {
  try {
    const res = await fetch(`${cfg.host}/api/projects/${cfg.projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { results?: unknown[][]; columns?: string[] };
    if (!data.results || !data.columns) return [];
    // Convert array-of-arrays to array-of-objects using columns
    return data.results.map((row) => {
      const obj: Record<string, unknown> = {};
      data.columns!.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj as T;
    });
  } catch {
    return null;
  }
}

function rangeToInterval(r: Range): string {
  return r === "7d" ? "7 day" : r === "30d" ? "30 day" : "90 day";
}

export async function fetchUtmBreakdown(cfg: PosthogConfig, range: Range): Promise<UtmRow[] | null> {
  const interval = rangeToInterval(range);
  const query = `
    SELECT
      coalesce(properties.\$initial_utm_source, '(direct)') AS source,
      coalesce(properties.\$initial_utm_medium, '(none)') AS medium,
      coalesce(properties.\$initial_utm_campaign, '(none)') AS campaign,
      uniq(person_id) AS visitors,
      count() AS pageviews
    FROM events
    WHERE event = '\$pageview'
      AND timestamp > now() - INTERVAL ${interval}
    GROUP BY source, medium, campaign
    ORDER BY visitors DESC
    LIMIT 50
  `;
  const rows = await runHogQL<{ source: string; medium: string; campaign: string; visitors: number; pageviews: number }>(
    cfg,
    query,
  );
  return rows;
}

export async function fetchUtmDaily(
  cfg: PosthogConfig,
  range: Range,
  filter: { source?: string; campaign?: string },
): Promise<UtmDailyRow[] | null> {
  const interval = rangeToInterval(range);
  const conds: string[] = [`event = '\$pageview'`, `timestamp > now() - INTERVAL ${interval}`];
  if (filter.source) {
    const safe = filter.source.replace(/'/g, "''");
    conds.push(`properties.\$initial_utm_source = '${safe}'`);
  }
  if (filter.campaign) {
    const safe = filter.campaign.replace(/'/g, "''");
    conds.push(`properties.\$initial_utm_campaign = '${safe}'`);
  }
  const query = `
    SELECT
      toString(toDate(timestamp)) AS day,
      uniq(person_id) AS visitors,
      count() AS pageviews
    FROM events
    WHERE ${conds.join(" AND ")}
    GROUP BY day
    ORDER BY day ASC
  `;
  const rows = await runHogQL<{ day: string; visitors: number; pageviews: number }>(cfg, query);
  return rows;
}
