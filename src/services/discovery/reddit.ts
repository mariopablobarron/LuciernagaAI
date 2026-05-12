/**
 * Reddit discovery client — busca posts recientes en subreddits relevantes
 * que mencionen keywords del producto.
 *
 * IMPORTANTE: Reddit bloquea IPs de cloud/VPS para los endpoints JSON
 * anónimos (devuelve HTML del desktop site). Por tanto, **requerimos OAuth
 * "Application Only"** desde producción. Sin credenciales → todo skipped.
 *
 * Setup (Mario, una vez):
 *   1. https://www.reddit.com/prefs/apps → Create app
 *   2. Tipo: "script" (read-only es suficiente)
 *   3. Redirect URI: https://tresmilmillonesdelatidos.es (no se usa)
 *   4. Copiar client_id (debajo del nombre) y client_secret
 *   5. Añadir en Coolify:
 *        REDDIT_CLIENT_ID=...
 *        REDDIT_CLIENT_SECRET=...
 *
 * Docs: https://www.reddit.com/dev/api / https://github.com/reddit-archive/reddit/wiki/OAuth2
 */

import { logError, logWarn } from "@/lib/logger";

const UA =
  "TresMilMillonesDeLatidos-Discovery/1.0 (by /u/luciernaga-ai; contact mario@startidea.es)";

const REDDIT_BASE = "https://oauth.reddit.com";
const REDDIT_AUTH = "https://www.reddit.com/api/v1/access_token";

// Cache del token: válido 1h. Refrescamos a los 50min para margen.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    logWarn("DISCOVERY", "reddit_no_credentials", { reason: "REDDIT_CLIENT_ID/SECRET not set" });
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(REDDIT_AUTH, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logWarn("DISCOVERY", "reddit_auth_error", { status: res.status, body: text.slice(0, 200) });
      return null;
    }

    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    cachedToken = {
      token: json.access_token,
      expiresAt: Date.now() + Math.min((json.expires_in ?? 3600) - 600, 3000) * 1000,
    };
    return cachedToken.token;
  } catch (e) {
    logError("DISCOVERY", e, { stage: "reddit_auth" });
    return null;
  }
}

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

/**
 * Subreddits hispanohablantes verificados con HTTP 200 al hacer audit
 * manual (12-may-2026). NO añadir ñ/acentos en URL (Reddit los rechaza).
 * NO añadir subreddits 302 (redirigen a página de búsqueda, no existen).
 */
export const TARGET_SUBREDDITS = [
  "spain",
  "AskRedditespanol",
  "argentina",
  "mexico",
  "Colombia",
  "chile",
  "peru",
  "ansiedad",
  "AnsiedadES",
  "Desahogo",
  "Desahogos",
  "psicologia",
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

async function fetchSubredditSearch(subreddit: string, query: string, token: string): Promise<RedditPost[]> {
  // Reddit search endpoint, restricted to one subreddit, sorted by new, last 7d
  const url = new URL(`${REDDIT_BASE}/r/${subreddit}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("restrict_sr", "on");
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", "week");
  url.searchParams.set("limit", "15");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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
 * Búsqueda global en Reddit (todos los subreddits), filtrada después por
 * los subreddits objetivo. Captura matches incluso en subs no listados.
 * Más eficiente que ir sub×keyword (12×14 = 168 vs 14 globales).
 */
async function fetchGlobalSearch(query: string, token: string): Promise<RedditPost[]> {
  const url = new URL(`${REDDIT_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", "week");
  url.searchParams.set("limit", "25");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      logWarn("DISCOVERY", "reddit_rate_limited", { query, retryAfter: ra });
      return [];
    }
    if (!res.ok) {
      logWarn("DISCOVERY", "reddit_global_error", { query, status: res.status });
      return [];
    }

    const json = (await res.json()) as RedditAPIResponse;
    const children = json.data?.children ?? [];

    const targetSet = new Set<string>(TARGET_SUBREDDITS.map((s) => s.toLowerCase()));

    return children
      .filter((c) => c.kind === "t3")
      .map((c) => c.data)
      .filter(
        (d) =>
          !d.over_18 &&
          !d.locked &&
          !d.archived &&
          !d.removed_by_category &&
          (d.selftext?.trim().length ?? 0) > 30 &&
          targetSet.has(d.subreddit.toLowerCase()),
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
    logError("DISCOVERY", e, { stage: "reddit_global_fetch", query });
    return [];
  }
}

/**
 * Busca matches usando dos estrategias complementarias:
 *  1. Búsqueda global por keyword, filtrada a subreddits objetivo
 *     (captura matches incluso en subs nuevos)
 *  2. Búsqueda dirigida sub×keyword en los subreddits clave de mental health
 *     (más profundidad en r/Desahogo, r/ansiedad, r/AnsiedadES, r/psicologia)
 *
 * Devuelve resultados deduplicados por externalId con keywords fusionadas.
 */
export async function discoverRedditMatches(): Promise<RedditPost[]> {
  const token = await getAccessToken();
  if (!token) {
    logWarn("DISCOVERY", "reddit_skipped_no_oauth", {
      hint: "Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to enable Reddit discovery",
    });
    return [];
  }

  const byId = new Map<string, RedditPost>();

  const merge = (matches: RedditPost[]) => {
    for (const match of matches) {
      const existing = byId.get(match.externalId);
      if (existing) {
        for (const k of match.matchedKeywords) {
          if (!existing.matchedKeywords.includes(k)) existing.matchedKeywords.push(k);
        }
      } else {
        byId.set(match.externalId, match);
      }
    }
  };

  // Estrategia 1: global por keyword
  for (const keyword of SEARCH_KEYWORDS) {
    const matches = await fetchGlobalSearch(keyword, token);
    merge(matches);
    await new Promise((r) => setTimeout(r, 250));
  }

  // Estrategia 2: profundidad en los 4 subreddits clave de mental health
  const DEEP_SUBS = ["Desahogo", "ansiedad", "AnsiedadES", "psicologia"];
  for (const subreddit of DEEP_SUBS) {
    for (const keyword of SEARCH_KEYWORDS) {
      const matches = await fetchSubredditSearch(subreddit, keyword, token);
      merge(matches);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return Array.from(byId.values());
}
