import { NextResponse } from "next/server";

/**
 * Headers que evitan que el navegador, proxies y CDN cacheen la respuesta.
 *
 * Útil en endpoints admin donde la respuesta cambia constantemente (stats,
 * previews, listas en vivo). Sin esto, ver una nueva versión de un endpoint
 * exige hard-reload por parte del usuario.
 */
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

type JsonInit = ResponseInit & { headers?: HeadersInit };

/**
 * Drop-in replacement de `NextResponse.json` que añade headers anti-cache.
 * El caller puede sobrescribir cualquier header pasando uno propio en `init.headers`.
 */
export function adminJson<T>(data: T, init: JsonInit = {}): NextResponse {
  const mergedHeaders = new Headers(init.headers);
  for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) {
    if (!mergedHeaders.has(k)) mergedHeaders.set(k, v);
  }
  return NextResponse.json(data, { ...init, headers: mergedHeaders });
}
