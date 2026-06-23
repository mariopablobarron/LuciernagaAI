import type { MetadataRoute } from "next";

const BASE = "https://tresmilmillonesdelatidos.es";

type Entry = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  /** Si la página tiene versiones traducidas en otros locales (en/pt/fr).
   *  Hoy solo la home (/) está realmente traducida. El resto sigue
   *  siendo solo ES — añadir hreflang sin traducción real es engaño SEO. */
  hasMultiLocale?: boolean;
};

const PAGES: Entry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly", hasMultiLocale: true },
  { path: "/precios", priority: 0.9, changeFrequency: "monthly" },
  { path: "/calculadora-latidos", priority: 0.9, changeFrequency: "monthly" },
  { path: "/test", priority: 0.8, changeFrequency: "monthly" },
  { path: "/unirse", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guia", priority: 0.8, changeFrequency: "weekly" },
  { path: "/como-funciona", priority: 0.8, changeFrequency: "monthly" },
  { path: "/casos-de-uso", priority: 0.8, changeFrequency: "monthly" },
  { path: "/recursos", priority: 0.8, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/reto", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sobre-nosotros", priority: 0.7, changeFrequency: "monthly" },
  { path: "/para-profesionales", priority: 0.7, changeFrequency: "monthly" },
  { path: "/etica", priority: 0.6, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/landing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PAGES.map((page) => ({
    url: `${BASE}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.hasMultiLocale
      ? {
          alternates: {
            languages: {
              es: `${BASE}${page.path}`,
              en: `${BASE}/en${page.path === "/" ? "" : page.path}`,
              pt: `${BASE}/pt${page.path === "/" ? "" : page.path}`,
              fr: `${BASE}/fr${page.path === "/" ? "" : page.path}`,
              de: `${BASE}/de${page.path === "/" ? "" : page.path}`,
              // x-default: indica a Google la versión "fallback" cuando no
              // matchea ningún idioma del browser del usuario. Apunta a ES.
              "x-default": `${BASE}${page.path}`,
            },
          },
        }
      : {}),
  }));
}
