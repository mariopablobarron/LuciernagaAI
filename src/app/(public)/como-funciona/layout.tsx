import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "El método — Tres Mil Millones de Latidos",
  description:
    "Cómo trabaja el mentor: interpelar antes de instruir, validar la emoción, ordenar el pensamiento, proponer acción. Un marco pedagógico basado en 15 años de acompañamiento real.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/como-funciona",
  },
  openGraph: {
    title: "El método — Tres Mil Millones de Latidos",
    description:
      "No damos consejos. Hacemos preguntas. El marco pedagógico detrás del mentor.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "El método" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "El método — Tres Mil Millones de Latidos",
    description:
      "Interpelar antes de instruir. El marco pedagógico detrás del mentor.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function ComoFuncionaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
