import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Novedades — Tres Mil Millones de Latidos",
  description:
    "Qué está cambiando en Tres Mil Millones de Latidos. Nuevas funciones, mejoras y decisiones de producto explicadas sin marketing.",
  alternates: buildAlternates("/changelog"),
  openGraph: {
    title: "Novedades — Tres Mil Millones de Latidos",
    description:
      "Qué está cambiando en el producto, explicado sin marketing.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Novedades" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Novedades — Tres Mil Millones de Latidos",
    description:
      "Qué está cambiando en el producto.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
