import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Recursos — Tres Mil Millones de Latidos",
  description:
    "Índice curado de guías, artículos y herramientas para entender qué te pasa y qué hacer. Reflexión, autoconocimiento, decisiones, bienestar emocional.",
  alternates: buildAlternates("/recursos"),
  openGraph: {
    title: "Recursos — Tres Mil Millones de Latidos",
    description:
      "Índice curado de guías, artículos y herramientas organizado por tema.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Recursos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recursos — Tres Mil Millones de Latidos",
    description:
      "Guías, artículos y herramientas organizadas por tema.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function RecursosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
