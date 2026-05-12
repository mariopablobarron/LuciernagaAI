/**
 * Reddit discovery client — busca posts recientes en subreddits relevantes
 * que mencionen keywords del producto.
 *
 * Usa la API JSON pública (no requiere auth para lectura). Solo requiere un
 * `User-Agent` honesto identificándote como cliente concreto — Reddit banea
 * agentes genéricos.
 *
 * Rate limits: ~60 req/min con UA honesto. Respetamos cabeceras de Retry-After.
 *
 * Docs: https://www.reddit.com/dev/api
 */

import { logError, logWarn } from "@/lib/logger";

const UA =
  "TresMilMillonesDeLatidos-Discovery/1.0 (by /u/luciernaga-ai; contact mario@startidea.es)";

const REDDIT_BASE = "https://www.reddit.com";

export type RedditPost = {
  platform: "reddit";
  externalId: string; // t3_xxxxx
  externalUrl: string;
  subreddit: string;
  title: string;
  excerpt: string; // selftext (truncated)
  authorHandle: string | null;
  postedAt: Date;
  score: number; // upvotes - downvotes
  numComments: number;
  matchedKeywords: string[];
};

type RedditAPIChild = {
  kind: "t3";
  data: {
    id: string;
    name: string; // t3_xxxx
    permalink: string;
    subreddit: string;
    subreddit_name_prefixed: string;
    title: string;
    selftext: string;
    author: string;
    created_utc: number;
    score: number;
    ups: number;
    downs: number;
    num_comments: number;
    over_18: boolean;
    locked: boolean;
    archived: boolean;
    removed_by_category: string | null;
  };
};

type RedditAPIResponse = {
  data?: { children?: RedditAPIChild[] };
};

/** Subreddits relevantes para el producto (mental health / wellbeing en español). */
export const TARGET_SUBREDDITS = [
  "españa",
  "spain",
  "SaludMentalES",
  "Productividad",
  "AskRedditespanol",
  "argentina",
  "mexico",
  "Pareja",
  "Universidad_es",
  "ansiedad",
  "Depression_es",
] as const;

/** Keywords y frases que indican un buen match. */
export const SEARCH_KEYWORDS = [
  "no consigo empezar",
  "estoy bloqueado",
  "procrastinación",
  "procrastino",
  "ansiedad antes de",
  "no sé qué hacer con mi vida",
  "psicólogo o coach",
  "diario emocional",
  "no sé qué quiero",
  "bloqueo mental",
  "ataque de ansiedad",
  "no consigo dormir por",
  "no sé qué escribir en mi diario",
  "mi terapeuta",
] as const;

const TRUNCATE = 800;

async function fetchSubredditSearch(subreddit: string, query: string): Promise<RedditPost[]> {
  // Reddit search endpoint, restricted to one subreddit, sorted by new, last 7d
  const url = new URL(`${REDDIT_BASE}/r/${subreddit}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("restrict_sr", "on");
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", "week");
  url.searchParams.set("limit", "15");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      logWarn("DISCOVERY", "reddit_rate_limited", { subreddit, retryAfter: ra });
      return [];
    }
    if (!res.ok) {
      logWarn("DISCOVERY", "reddit_search_error", { subreddit, status: res.status });
      return [];
    }

    const json = (await res.json()) as RedditAPIResponse;
    const children = json.data?.children ?? [];

    return children
      .filter((c) => c.kind === "t3")
      .map((c) => c.data)
      .filter(
        (d) =>
          !d.over_18 &&
          !d.locked &&
          !d.archived &&
          !d.removed_by_category &&
          (d.selftext?.trim().length ?? 0) > 30, // ignore link-only or near-empty posts
      )
      .map<RedditPost>((d) => ({
        platform: "reddit",
        externalId: d.name,
        externalUrl: `${REDDIT_BASE}${d.permalink}`,
        subreddit: d.subreddit_name_prefixed,
        title: d.title,
        excerpt: d.selftext.slice(0, TRUNCATE),
        authorHandle: d.author === "[deleted]" ? null : d.author,
        postedAt: new Date(d.created_utc * 1000),
        score: d.score,
        numComments: d.num_comments,
        matchedKeywords: [query],
      }));
  } catch (e) {
    logError("DISCOVERY", e, { stage: "reddit_fetch", subreddit, query });
    return [];
  }
}

/**
 * Busca matches en todos los subreddits objetivo para todas las keywords.
 * Devuelve resultados deduplicados por externalId con keywords fusionadas.
 *
 * Rate-limited: 200ms entre llamadas para mantenerse cómodamente bajo el límite.
 */
export async function discoverRedditMatches(): Promise<RedditPost[]> {
  const byId = new Map<string, RedditPost>();

  for (const subreddit of TARGET_SUBREDDITS) {
    for (const keyword of SEARCH_KEYWORDS) {
      const matches = await fetchSubredditSearch(subreddit, keyword);
      for (const match of matches) {
        const existing = byId.get(match.externalId);
        if (existing) {
          // Merge matched keywords
          for (const k of match.matchedKeywords) {
            if (!existing.matchedKeywords.includes(k)) existing.matchedKeywords.push(k);
          }
        } else {
          byId.set(match.externalId, match);
        }
      }
      // Be polite to Reddit
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return Array.from(byId.values());
}
