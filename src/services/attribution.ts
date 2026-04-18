import { getPrismaClient } from "@/db/prisma";

export type AttributionRow = {
  source: string; // utm_source, legacy string, or "(direct)"
  medium: string | null; // top utm_medium for this source
  campaign: string | null; // top utm_campaign for this source
  signups: number;
  proUsers: number;
  proRate: number; // 0..1
};

export type AttributionRange = "7d" | "30d" | "90d" | "all";

export type AttributionReport = {
  range: AttributionRange;
  rangeStart: string | null; // ISO or null if "all"
  totalSignups: number;
  totalPro: number;
  overallProRate: number;
  rows: AttributionRow[];
};

type ParsedSource = {
  source: string;
  medium: string | null;
  campaign: string | null;
};

/**
 * Normalizes User.source into a canonical { source, medium, campaign } tuple.
 *
 * Handles three shapes historically present in the column:
 *  1. JSON stringified UTM object: {"utm_source":"google","utm_medium":"cpc",...}
 *  2. Plain string (legacy): "telegram", "classroom:foo", etc.
 *  3. null / empty: treated as "(direct)"
 */
function parseSource(raw: string | null): ParsedSource {
  if (!raw || !raw.trim()) {
    return { source: "(direct)", medium: null, campaign: null };
  }

  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, string | undefined>;
      const source =
        parsed.utm_source?.trim() ||
        parsed.source?.trim() ||
        "(unknown)";
      return {
        source: source.toLowerCase(),
        medium: parsed.utm_medium?.trim().toLowerCase() ?? null,
        campaign: parsed.utm_campaign?.trim() ?? null,
      };
    } catch {
      return { source: "(malformed)", medium: null, campaign: null };
    }
  }

  // Legacy plain string — keep as-is but normalize case
  return {
    source: trimmed.toLowerCase(),
    medium: null,
    campaign: null,
  };
}

function rangeCutoff(range: AttributionRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Builds an attribution report grouped by utm_source. The "medium" and
 * "campaign" shown per row are the most common values for that source
 * — useful as a quick signal, not a full drill-down.
 */
export async function getAttributionReport(
  range: AttributionRange = "30d",
): Promise<AttributionReport> {
  const prisma = getPrismaClient();
  const cutoff = rangeCutoff(range);

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
    },
    select: {
      id: true,
      source: true,
      subscriptions: {
        where: { plan: "pro", status: "active" },
        select: { id: true },
        take: 1,
      },
    },
  });

  type Agg = {
    signups: number;
    proUsers: number;
    mediumCounts: Map<string, number>;
    campaignCounts: Map<string, number>;
  };
  const bySource = new Map<string, Agg>();
  let totalPro = 0;

  for (const user of users) {
    const parsed = parseSource(user.source);
    const agg = bySource.get(parsed.source) ?? {
      signups: 0,
      proUsers: 0,
      mediumCounts: new Map<string, number>(),
      campaignCounts: new Map<string, number>(),
    };
    agg.signups += 1;
    const isPro = user.subscriptions.length > 0;
    if (isPro) {
      agg.proUsers += 1;
      totalPro += 1;
    }
    if (parsed.medium) {
      agg.mediumCounts.set(
        parsed.medium,
        (agg.mediumCounts.get(parsed.medium) ?? 0) + 1,
      );
    }
    if (parsed.campaign) {
      agg.campaignCounts.set(
        parsed.campaign,
        (agg.campaignCounts.get(parsed.campaign) ?? 0) + 1,
      );
    }
    bySource.set(parsed.source, agg);
  }

  function topOf(counts: Map<string, number>): string | null {
    let best: string | null = null;
    let bestN = 0;
    for (const [k, n] of counts) {
      if (n > bestN) {
        best = k;
        bestN = n;
      }
    }
    return best;
  }

  const rows: AttributionRow[] = [];
  for (const [source, agg] of bySource) {
    rows.push({
      source,
      medium: topOf(agg.mediumCounts),
      campaign: topOf(agg.campaignCounts),
      signups: agg.signups,
      proUsers: agg.proUsers,
      proRate: agg.signups > 0 ? agg.proUsers / agg.signups : 0,
    });
  }
  rows.sort((a, b) => b.signups - a.signups);

  return {
    range,
    rangeStart: cutoff?.toISOString() ?? null,
    totalSignups: users.length,
    totalPro,
    overallProRate: users.length > 0 ? totalPro / users.length : 0,
    rows,
  };
}
