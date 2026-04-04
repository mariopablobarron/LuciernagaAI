import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Empieza gratis — Luciérnaga AI",
  description:
    "Crea tu cuenta en Luciérnaga en menos de 60 segundos. Sin tarjeta. Detecta tu estado mental y recibe un plan de acción personalizado hoy.",
  openGraph: {
    title: "Empieza gratis — Luciérnaga AI",
    description:
      "Crea tu cuenta en menos de 60 segundos. Sin tarjeta. Primer paso concreto hoy.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary",
    title: "Empieza gratis — Luciérnaga AI",
    description: "Crea tu cuenta en menos de 60 segundos. Sin tarjeta.",
  },
  robots: { index: true, follow: true },
};

export default function UnirseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
