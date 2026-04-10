import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tres Mil Millones de Latidos — Mentoria con IA para transformar tu vida",
  description:
    "Tres Mil Millones de Latidos es una plataforma de mentoria con IA en espanol. Detecta tu estado emocional, te ayuda a ordenar ideas y te propone microacciones concretas para hoy. Gratis.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/landing",
  },
  openGraph: {
    title: "Tres Mil Millones de Latidos — Mentoria con IA para transformar tu vida",
    description:
      "Mentor con IA que detecta tu estado emocional y te guia a la accion concreta. Objetivos, check-ins y retos de 21 dias. Gratis.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos — Mentoria con IA",
    description: "Mentor con IA que detecta tu estado emocional y te guia a la accion concreta. Gratis.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
