import type { MetadataRoute } from "next";

const BASE = "https://tresmilmillonesdelatidos.es";

type Entry = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  hasEn?: boolean;
};

const PAGES: Entry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly", hasEn: true },
  { path: "/precios", priority: 0.9, changeFrequency: "monthly" },
  { path: "/calculadora-latidos", priority: 0.9, changeFrequency: "monthly" },
  { path: "/test", priority: 0.8, changeFrequency: "monthly" },
  { path: "/unirse", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guia", priority: 0.8, changeFrequency: "weekly" },
  { path: "/reto", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sobre-nosotros", priority: 0.7, changeFrequency: "monthly" },
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
    ...(page.hasEn
      ? {
          alternates: {
            languages: {
              es: `${BASE}${page.path}`,
              en: `${BASE}/en${page.path === "/" ? "" : page.path}`,
            },
          },
        }
      : {}),
  }));
}
