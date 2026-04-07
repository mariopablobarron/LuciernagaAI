import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tres Mil Millones de Latidos — Mentoría con IA para transformar tu vida",
  description:
    "Cambia tu vida un hábito a la vez. IA conversacional que detecta tu estado emocional y te guía a la acción concreta. Gratis.",
  openGraph: {
    title: "Tres Mil Millones de Latidos — Mentoría con IA para transformar tu vida",
    description:
      "Cambia tu vida un hábito a la vez. IA conversacional que detecta tu estado emocional y te guía a la acción concreta. Gratis.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos — Mentoría con IA para transformar tu vida",
    description:
      "Cambia tu vida un hábito a la vez. IA conversacional que detecta tu estado emocional y te guía a la acción concreta. Gratis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
