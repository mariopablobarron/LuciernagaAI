import { logError, logInfo } from "@/lib/logger";
import { withTimeout } from "@/lib/utils";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: "duckduckgo" | "wikipedia";
};

const SEARCH_TIMEOUT_MS = 6000;

const EXTERNAL_REQUEST_VERBS = [
  /\b(busca|buscame|búscame|investiga|consulta|encuentra|recomienda|recomiendame|recomiéndame|dame|muestrame|muéstrame|compara)\b/,
];

const REAL_WORLD_OPTION_PATTERNS = [
  /\b(opciones|alternativas|recursos|contactos|telefonos|teléfonos|lugares|centros|apps|herramientas|servicios|profesionales|terapeutas|psicologos|psicólogos|cursos|planes|proveedores)\b/,
];

const CONCRETE_DOUBT_PATTERNS = [
  /\b(cual|cuál|donde|dónde|quien|quién|precio|coste|horario|disponibilidad|telefono|teléfono|contacto)\b/,
];

const PRACTICAL_DECISION_PATTERNS = [
  /\b(decidir|comparar|elegir|contratar|reservar|comprar|agendar|contactar|llamar|inscribirme|inscribirme)\b/,
];

const EMOTIONAL_REFLECTION_PATTERNS = [
  /\b(me siento|estoy|me pasa|quiero ayuda|necesito ayuda|no se que hacer|no sé qué hacer)\b/,
  /\b(ansiedad|bloqueo|duda|miedo|procrastin|emocion|emoción|rumiando)\b/,
];

export type ExternalInfoClassification = {
  shouldUse: boolean;
  usage: "practical_decision" | "none";
};

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

export function classifyExternalInfoNeed(message: string): ExternalInfoClassification {
  const normalized = normalizeText(message);
  const hasRequestVerb = EXTERNAL_REQUEST_VERBS.some((pattern) => pattern.test(normalized));
  const asksForRealOptions = REAL_WORLD_OPTION_PATTERNS.some((pattern) => pattern.test(normalized));
  const hasConcreteDoubt = CONCRETE_DOUBT_PATTERNS.some((pattern) => pattern.test(normalized));
  const hasPracticalDecision = PRACTICAL_DECISION_PATTERNS.some((pattern) => pattern.test(normalized));
  const isEmotionalReflection = EMOTIONAL_REFLECTION_PATTERNS.some((pattern) =>
    pattern.test(normalized)
  );

  if (!hasRequestVerb || !asksForRealOptions) {
    return {
      shouldUse: false,
      usage: "none",
    };
  }

  if (isEmotionalReflection && !hasConcreteDoubt && !hasPracticalDecision && !asksForRealOptions) {
    return {
      shouldUse: false,
      usage: "none",
    };
  }

  return {
    shouldUse: true,
    usage: "practical_decision",
  };
}

export function needsExternalInfo(message: string): boolean {
  return classifyExternalInfoNeed(message).shouldUse;
}

export function buildSearchQuery(message: string): string {
  return message
    .replace(
      /\b(por favor|puedes|podrias|podrías|me puedes|quiero saber|necesito saber|dame|muestrame|muéstrame|recomiendame|recomiéndame)\b/gi,
      ""
    )
    .replace(/\b(opciones|alternativas|reales)\b/gi, "")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .replace(/^de\s+/i, "")
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
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
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
