import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¿Qué te frena ahora? — Test gratuito de bloqueo mental | Tres Mil Millones de Latidos",
  description:
    "5 preguntas. Descubre si estás bloqueado, ansioso o en niebla de dirección. Resultado inmediato con una acción concreta para hoy. Sin registro.",
  openGraph: {
    title: "¿Qué te frena ahora mismo?",
    description:
      "Diagnóstico gratuito de estado mental. 5 preguntas, resultado inmediato y una acción para hoy.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Qué te frena ahora mismo?",
    description:
      "Diagnóstico gratuito de estado mental. 5 preguntas, resultado inmediato y una acción para hoy.",
  },
  keywords: [
    "bloqueo mental",
    "ansiedad productividad",
    "test emocional",
    "diagnóstico bloqueo",
    "como superar bloqueo",
    "herramienta claridad mental",
    "coach IA gratis",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
