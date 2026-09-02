import type { Metadata } from "next";
import type { ReactNode } from "react";

// ISR: revalidate cada 24h. Estas páginas cambian poco — el HTML cacheado
// reduce TTFB y carga del VPS. SEO audit 2026-06-23 #8.
export const revalidate = 86400;
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description:
    "Quiénes somos, por qué construimos un mentor IA con supervisión clínica humana, y por qué insistimos en que NO sustituye a las personas que te quieren.",
  alternates: buildAlternates("/sobre-nosotros"),
  openGraph: {
    title: "Sobre nosotros · Tres Mil Millones de Latidos",
    description:
      "El equipo detrás del mentor IA. Supervisión clínica humana, posicionamiento anti-engagement, transparencia sobre lo que la IA no puede sustituir.",
    type: "website",
    url: "https://tresmilmillonesdelatidos.es/sobre-nosotros",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Sobre Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre nosotros · Tres Mil Millones de Latidos",
    description: "Quiénes somos y por qué insistimos en que la IA no sustituye a las personas que te quieren.",
    images: ["/opengraph-image"],
  },
};

export default function SobreNosotrosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
