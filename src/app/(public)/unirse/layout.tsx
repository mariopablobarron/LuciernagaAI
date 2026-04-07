import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Únete a Tres Mil Millones de Latidos — Empieza tu transformación",
  description:
    "Responde 3 preguntas sobre lo que quieres cambiar y accede a la plataforma de mentoría con IA que te guía a la acción real.",
  openGraph: {
    title: "Únete a Tres Mil Millones de Latidos — Empieza tu transformación",
    description:
      "Responde 3 preguntas sobre lo que quieres cambiar y accede a la plataforma de mentoría con IA que te guía a la acción real.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Únete a Tres Mil Millones de Latidos — Empieza tu transformación",
    description:
      "Responde 3 preguntas sobre lo que quieres cambiar y accede a la plataforma de mentoría con IA que te guía a la acción real.",
  },
  robots: { index: true, follow: true },
};

export default function UnirseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
