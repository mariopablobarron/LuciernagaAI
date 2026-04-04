import type { MetadataRoute } from "next";

const BASE_URL = process.env.APP_BASE_URL?.trim() || "https://luciernaga.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/test", "/unirse", "/precios", "/contact", "/privacy", "/terms"],
        disallow: ["/admin", "/app", "/api", "/dashboard", "/impulso", "/editor", "/family"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
