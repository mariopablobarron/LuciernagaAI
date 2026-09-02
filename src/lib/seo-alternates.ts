/**
 * Helper de `alternates` para Next.js Metadata API.
 *
 * Motivo: en Next.js 16 App Router, `metadata.alternates` NO se merge entre
 * layouts padre e hijo — se sobrescribe entero. Si un layout hijo declara
 * `alternates: { canonical: "..." }` sin incluir `languages`, PIERDE el
 * mapping de hreflang que declara el root layout.
 *
 * Bug real observado en producción (SEP-2026): las subpáginas /precios, /faq,
 * /blog, /como-funciona, /reto, /sobre-nosotros, etc. no emitían NINGÚN
 * `<link rel="alternate" hreflang="…">` en el `<head>`. Toda la inversión de
 * i18n (es/en/pt/fr/de) quedaba invisible para Google fuera del sitemap.
 *
 * Uso:
 *
 *   import { buildAlternates } from "@/lib/seo-alternates";
 *
 *   export const metadata: Metadata = {
 *     title: "…",
 *     alternates: buildAlternates("/reto"),
 *   };
 *
 * Pasa el pathname sin el prefijo de locale (siempre en versión ES/raíz).
 * El helper añade automáticamente el canonical, el mapping para los 5 locales
 * y el `x-default` para navegadores sin locale reconocido.
 */

export const SITE_ORIGIN = "https://tresmilmillonesdelatidos.es";

/**
 * Mapping locale → prefijo de ruta. ES vive en la raíz (sin prefijo);
 * el resto viven bajo `/<lang>/`.
 *
 * Mantener sincronizado con `src/i18n/routing.ts` (routing.locales) y con
 * `middleware.ts` (regex de locales del proxy).
 */
export const LOCALE_PATH_PREFIX: Record<string, string> = {
  es: "",
  en: "/en",
  pt: "/pt",
  fr: "/fr",
  de: "/de",
};

/**
 * Construye el objeto `alternates` completo (canonical + languages + x-default)
 * para una ruta dada.
 *
 * @param pathname ruta sin origen, con o sin barra inicial. Ej: "/reto",
 *                 "reto", "/blog/mi-post". Usa "/" para el home.
 */
export function buildAlternates(pathname: string): {
  canonical: string;
  languages: Record<string, string>;
} {
  const clean = pathname === "" || pathname === "/" ? "/" : (pathname.startsWith("/") ? pathname : `/${pathname}`);
  const suffix = clean === "/" ? "" : clean;
  const canonical = `${SITE_ORIGIN}${suffix}`;

  const languages: Record<string, string> = {};
  for (const [lang, prefix] of Object.entries(LOCALE_PATH_PREFIX)) {
    languages[lang] = prefix === "" ? canonical : `${SITE_ORIGIN}${prefix}${suffix}`;
  }
  // x-default: sin locale preferente, servimos la versión ES/raíz. Google
  // usa x-default como fallback cuando el idioma del usuario no matchea.
  languages["x-default"] = canonical;

  return { canonical, languages };
}
