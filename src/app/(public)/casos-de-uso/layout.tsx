import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Casos de uso — Tres Mil Millones de Latidos",
  description:
    "¿Te bloqueas ante decisiones? ¿Vives con ansiedad cotidiana? ¿Atraviesas una transición vital? Descubre cómo el mentor te acompaña según lo que traigas.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/casos-de-uso",
  },
  openGraph: {
    title: "Casos de uso — Tres Mil Millones de Latidos",
    description:
      "Bloqueos, ansiedad cotidiana, transiciones vitales, autoconocimiento. Cómo el mentor encaja según tu momento.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Casos de uso" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Casos de uso — Tres Mil Millones de Latidos",
    description:
      "Cómo el mentor encaja según lo que estés atravesando.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function CasosDeUsoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
