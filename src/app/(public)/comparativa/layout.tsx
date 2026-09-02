import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Tres Mil Millones de Latidos vs ChatGPT, terapia y apps de bienestar — Comparativa honesta",
  description:
    "Comparativa objetiva: Tres Mil Millones de Latidos frente a ChatGPT, terapia tradicional, y apps de meditación como Calm o Headspace. Qué hace cada una, cuándo elegir cuál, precios, privacidad, supervisión clínica.",
  alternates: buildAlternates("/comparativa"),
  openGraph: {
    title: "Tres Mil Millones de Latidos vs ChatGPT, terapia y apps de bienestar",
    description:
      "Cuándo elegir Tres Mil Millones de Latidos, cuándo elegir otra cosa. Sin exagerar, sin ocultar lo que no hacemos.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Comparativa Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos vs ChatGPT, terapia y apps de bienestar",
    description: "Comparativa honesta: qué hace cada herramienta, cuándo conviene cada una.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function ComparativaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
