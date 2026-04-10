import type { MetadataRoute } from "next";

const BASE_URL = process.env.APP_BASE_URL?.trim() || "https://tresmilmillonesdelatidos.es";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/test", "/unirse", "/precios", "/guia", "/blog", "/reto", "/landing", "/sobre-nosotros", "/contact", "/privacy", "/terms", "/calculadora-latidos"],
        disallow: ["/admin", "/app", "/api", "/dashboard", "/impulso", "/editor", "/family"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
