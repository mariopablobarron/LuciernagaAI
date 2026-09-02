import type { Metadata } from "next";
import type { ReactNode } from "react";

// Metadata server-side para /para-profesionales (page.tsx es client component
// y no puede exportar generateMetadata). SEO audit 2026-06-23: la página no
// tenía title/description/OG propios. Esta landing es la principal puerta B2B.

// ISR: revalidate cada 24h. Estas páginas cambian poco — el HTML cacheado
// reduce TTFB y carga del VPS. SEO audit 2026-06-23 #8.
export const revalidate = 86400;
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Mentor IA para profesionales de salud mental",
  description:
    "Panel clínico, detección temprana de riesgo y notas integradas. La IA acompaña a tu cliente entre sesiones sin sustituir tu trabajo. Piloto 3 meses gratis.",
  alternates: buildAlternates("/para-profesionales"),
  openGraph: {
    title: "Mentor IA para profesionales de salud mental",
    description:
      "Panel clínico con seguimiento entre sesiones, detección temprana de riesgo, notas integradas. Diseñado como complemento — no sustituto — del trabajo clínico.",
    type: "website",
    url: "https://tresmilmillonesdelatidos.es/para-profesionales",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Tres Mil Millones de Latidos para profesionales" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentor IA para profesionales de salud mental",
    description: "Acompañamiento entre sesiones, detección de riesgo, notas clínicas. Piloto gratuito 3 meses.",
    images: ["/opengraph-image"],
  },
};

export default function ParaProfesionalesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
