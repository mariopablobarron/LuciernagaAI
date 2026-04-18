import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preguntas frecuentes — Tres Mil Millones de Latidos",
  description:
    "Respuestas claras sobre cómo funciona Tres Mil Millones de Latidos: IA, privacidad, precios, diferencias con terapia y lo que puedes esperar del mentor.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/faq",
  },
  openGraph: {
    title: "Preguntas frecuentes — Tres Mil Millones de Latidos",
    description:
      "Todo lo que la gente pregunta antes de empezar: cómo funciona, qué hace la IA, privacidad, precios y límites.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Preguntas frecuentes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Preguntas frecuentes — Tres Mil Millones de Latidos",
    description:
      "Cómo funciona, qué hace la IA, privacidad, precios y límites del mentor.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
