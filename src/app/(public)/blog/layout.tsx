import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Tres Mil Millones de Latidos",
  description:
    "Articulos, recomendaciones y reflexiones sobre bienestar emocional, desarrollo personal e inteligencia artificial. Por el equipo de Tres Mil Millones de Latidos.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/blog",
  },
  openGraph: {
    title: "Blog — Tres Mil Millones de Latidos",
    description: "Articulos sobre bienestar emocional, desarrollo personal e IA.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Blog — Tres Mil Millones de Latidos" }],
  },
  robots: { index: true, follow: true },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
