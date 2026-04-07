import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía de uso — Tres Mil Millones de Latidos",
  description:
    "Aprende a usar Tres Mil Millones de Latidos: conversaciones, objetivos, check-ins, retos y seguimiento emocional con IA.",
  openGraph: {
    title: "Guía de uso — Tres Mil Millones de Latidos",
    description:
      "Aprende a usar Tres Mil Millones de Latidos: conversaciones, objetivos, check-ins, retos y seguimiento emocional con IA.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guía de uso — Tres Mil Millones de Latidos",
    description:
      "Aprende a usar Tres Mil Millones de Latidos: conversaciones, objetivos, check-ins, retos y seguimiento emocional con IA.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
