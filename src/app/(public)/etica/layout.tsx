import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Ética y límites — Tres Mil Millones de Latidos",
  description:
    "Nuestro posicionamiento sobre IA, datos, dependencia emocional y límites clínicos. Lo que sí hacemos, lo que nunca haremos, y por qué.",
  alternates: buildAlternates("/etica"),
  openGraph: {
    title: "Ética y límites — Tres Mil Millones de Latidos",
    description:
      "Posicionamiento sobre IA, datos, dependencia emocional y límites clínicos.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Ética y límites" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ética y límites — Tres Mil Millones de Latidos",
    description:
      "Lo que sí hacemos, lo que nunca haremos, y por qué.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function EticaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
