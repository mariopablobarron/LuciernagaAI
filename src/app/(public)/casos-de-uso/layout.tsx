import type { Metadata } from "next";
import type { ReactNode } from "react";

// ISR: revalidate cada 24h. Estas páginas cambian poco — el HTML cacheado
// reduce TTFB y carga del VPS. SEO audit 2026-06-23 #8.
export const revalidate = 86400;
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Casos de uso",
  description:
    "Bloqueo creativo, ansiedad antes de una decisión, niebla mental, claridad que no sabes cómo bajar a tierra. Cuatro estados habituales y cómo el mentor te acompaña.",
  alternates: buildAlternates("/casos-de-uso"),
  openGraph: {
    title: "Casos de uso · Tres Mil Millones de Latidos",
    description:
      "Bloqueo, ansiedad, niebla, claridad. Los cuatro estados donde el mentor IA aporta valor real entre sesiones (o sin terapia detrás).",
    type: "website",
    url: "https://tresmilmillonesdelatidos.es/casos-de-uso",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Casos de uso Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Casos de uso · Tres Mil Millones de Latidos",
    description: "Bloqueo, ansiedad, niebla, claridad. Cómo el mentor te acompaña en cada estado.",
    images: ["/opengraph-image"],
  },
};

export default function CasosDeUsoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
