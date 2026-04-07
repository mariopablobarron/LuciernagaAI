import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test gratuito de estado emocional — Tres Mil Millones de Latidos",
  description:
    "Descubre tu estado emocional en 5 preguntas. Bloqueo, ansiedad, duda o claridad: identifica dónde estás y recibe tu primer paso de acción.",
  openGraph: {
    title: "Test gratuito de estado emocional — Tres Mil Millones de Latidos",
    description:
      "Descubre tu estado emocional en 5 preguntas. Bloqueo, ansiedad, duda o claridad: identifica dónde estás y recibe tu primer paso de acción.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Test gratuito de estado emocional — Tres Mil Millones de Latidos",
    description:
      "Descubre tu estado emocional en 5 preguntas. Bloqueo, ansiedad, duda o claridad: identifica dónde estás y recibe tu primer paso de acción.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
