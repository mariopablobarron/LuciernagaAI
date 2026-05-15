/**
 * IndexNow — protocolo abierto que notifica a Bing, Yandex y otros buscadores
 * sobre cambios de URL en tiempo real. Indexación en minutos vs semanas.
 *
 * Funciona así:
 *   1. Generamos una key aleatoria (env INDEXNOW_KEY)
 *   2. Servimos esa key en /[KEY].txt como verificación
 *   3. POST a https://api.indexnow.org/IndexNow con {host, key, urlList}
 *   4. Bing+Yandex propagan al resto de buscadores compatibles
 *
 * Bonus: Bing alimenta ChatGPT search, Copilot, DuckDuckGo, Yahoo. Una
 * llamada → muchos buscadores.
 *
 * Docs: https://www.indexnow.org/documentation
 */

import { logError, logInfo, logWarn } from "@/lib/logger";

const HOST = "tresmilmillonesdelatidos.es";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const MAX_URLS_PER_BATCH = 10_000; // límite del protocolo

export function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY?.trim() || null;
}

/**
 * Notifica a IndexNow una lista de URLs nuevas/actualizadas.
 * Las URLs deben pertenecer al `host` (mismo dominio que la key).
 *
 * No falla si no hay key configurada — solo logea warn (degradación graciosa).
 */
export async function notifyIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number; error?: string }> {
  const key = getIndexNowKey();
  if (!key) {
    logWarn("SEO", "indexnow_no_key", { reason: "INDEXNOW_KEY not configured" });
    return { ok: false, error: "no_key" };
  }

  const cleanUrls = urls
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && u.includes(HOST))
    .slice(0, MAX_URLS_PER_BATCH);

  if (cleanUrls.length === 0) {
    return { ok: false, error: "no_valid_urls" };
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        host: HOST,
        key,
        // Bing exige que la key sea accesible en /<KEY>.txt en la raíz del
        // dominio. next.config rewrite mapea ese path al endpoint que
        // devuelve la key. Si usamos /api/... → HTTP 422 (URL no validada).
        keyLocation: `https://${HOST}/${key}.txt`,
        urlList: cleanUrls,
      }),
    });

    if (res.ok || res.status === 202) {
      logInfo("SEO", "indexnow_ok", { count: cleanUrls.length, status: res.status });
      return { ok: true, status: res.status };
    }

    const text = await res.text().catch(() => "");
    logWarn("SEO", "indexnow_error", { status: res.status, body: text.slice(0, 200) });
    return { ok: false, status: res.status, error: text.slice(0, 200) };
  } catch (e) {
    logError("SEO", e, { stage: "indexnow_notify" });
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** Helper: notifica una sola URL. */
export async function notifyIndexNowSingle(url: string): Promise<boolean> {
  const result = await notifyIndexNow([url]);
  return result.ok;
}

/** Notifica todas las URLs del sitemap (útil para bulk-submit inicial). */
export async function notifyIndexNowFromSitemap(): Promise<{ ok: boolean; submitted: number }> {
  try {
    const res = await fetch(`https://${HOST}/sitemap.xml`, { cache: "no-store" });
    if (!res.ok) return { ok: false, submitted: 0 };
    const xml = await res.text();
    const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).filter((u): u is string => Boolean(u));
    const result = await notifyIndexNow(urls);
    return { ok: result.ok, submitted: result.ok ? urls.length : 0 };
  } catch (e) {
    logError("SEO", e, { stage: "indexnow_sitemap" });
    return { ok: false, submitted: 0 };
  }
}
