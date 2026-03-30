import { logError, logInfo } from "@/lib/logger";
import { withTimeout } from "@/lib/utils";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: "duckduckgo" | "wikipedia";
};

const SEARCH_TIMEOUT_MS = 6000;

const EXTERNAL_INFO_PATTERNS = [
  /\b(busca|buscame|búscame|investiga|consulta)\b/,
  /\b(ultimo|último|ultimos|últimos|actual|actualidad|hoy)\b/,
  /\b(noticia|noticias|precio|cotiza|tendencia|mercado)\b/,
  /\b(que es|qué es|quien es|quién es|como funciona|cómo funciona)\b/,
  /\b(datos de|informacion sobre|información sobre)\b/,
];

const PERSONAL_COACHING_PATTERNS = [
  /\b(me siento|estoy|me pasa|quiero ayuda|necesito ayuda)\b/,
  /\b(ansiedad|bloqueo|duda|miedo|procrastin)\b/,
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueByUrl(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const deduped: WebSearchResult[] = [];

  for (const result of results) {
    const key = `${result.source}:${result.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }

  return deduped;
}

export function needsExternalInfo(message: string): boolean {
  const normalized = normalizeText(message);
  const hasExternalSignal = EXTERNAL_INFO_PATTERNS.some((pattern) => pattern.test(normalized));
  const looksPersonal = PERSONAL_COACHING_PATTERNS.some((pattern) => pattern.test(normalized));

  if (!hasExternalSignal) {
    return false;
  }

  return !looksPersonal || /\b(busca|investiga|actual|hoy|noticias)\b/.test(normalized);
}

export function buildSearchQuery(message: string): string {
  return message
    .replace(/\b(por favor|puedes|podrias|podrías|me puedes|quiero saber|necesito saber)\b/gi, "")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapDuckDuckGoTopics(topics: unknown[]): WebSearchResult[] {
  const results: WebSearchResult[] = [];

  for (const topic of topics) {
    if (!topic || typeof topic !== "object") {
      continue;
    }

    if (Array.isArray((topic as { Topics?: unknown[] }).Topics)) {
      results.push(...mapDuckDuckGoTopics((topic as { Topics: unknown[] }).Topics));
      continue;
    }

    const text =
      typeof (topic as { Text?: unknown }).Text === "string"
        ? (topic as { Text: string }).Text
        : "";
    const firstUrl =
      typeof (topic as { FirstURL?: unknown }).FirstURL === "string"
        ? (topic as { FirstURL: string }).FirstURL
        : "";

    if (!text || !firstUrl) {
      continue;
    }

    const [title, ...rest] = text.split(" - ");
    results.push({
      title: title.trim() || text.slice(0, 80),
      url: firstUrl,
      snippet: rest.join(" - ").trim() || text,
      source: "duckduckgo",
    });
  }

  return results;
}

async function fetchDuckDuckGo(query: string): Promise<WebSearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await withTimeout(fetch(url), SEARCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`DuckDuckGo HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    Heading?: string;
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: unknown[];
  };

  const results: WebSearchResult[] = [];

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading?.trim() || query,
      url: data.AbstractURL,
      snippet: data.AbstractText.trim(),
      source: "duckduckgo",
    });
  }

  if (Array.isArray(data.RelatedTopics)) {
    results.push(...mapDuckDuckGoTopics(data.RelatedTopics));
  }

  return results;
}

async function fetchWikipedia(query: string): Promise<WebSearchResult[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&utf8=1&format=json&origin=*`;
  const response = await withTimeout(fetch(url), SEARCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Wikipedia HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    query?: {
      search?: Array<{
        title?: string;
        snippet?: string;
      }>;
    };
  };

  return (data.query?.search || []).map((item) => ({
    title: item.title?.trim() || query,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title || query)}`,
    snippet: (item.snippet || "").replace(/<[^>]+>/g, "").trim(),
    source: "wikipedia" as const,
  }));
}

export async function searchWeb(query: string, limit = 3): Promise<WebSearchResult[]> {
  const safeLimit = Math.max(1, Math.min(5, Math.round(limit)));
  const results: WebSearchResult[] = [];

  try {
    results.push(...(await fetchDuckDuckGo(query)));
  } catch (error: unknown) {
    logError("SEARCH", error, { provider: "duckduckgo", query });
  }

  if (results.length < safeLimit) {
    try {
      results.push(...(await fetchWikipedia(query)));
    } catch (error: unknown) {
      logError("SEARCH", error, { provider: "wikipedia", query });
    }
  }

  const deduped = uniqueByUrl(results)
    .filter((result) => result.snippet.length > 0)
    .slice(0, safeLimit);

  logInfo("SEARCH", "search_web_completed", {
    query,
    results: deduped.length,
  });

  return deduped;
}
