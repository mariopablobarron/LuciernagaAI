import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Qué es Tres Mil Millones de Latidos, cómo protegemos tu privacidad, por qué NO es terapia, cuándo derivamos al 024. Respuestas claras a las dudas habituales.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/faq",
  },
  openGraph: {
    title: "Preguntas frecuentes · Tres Mil Millones de Latidos",
    description:
      "Privacidad, diferencia con terapia, derivación a recursos de crisis, supervisión clínica. Respuestas honestas a las preguntas habituales.",
    type: "website",
    url: "https://tresmilmillonesdelatidos.es/faq",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "FAQ Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Preguntas frecuentes · Tres Mil Millones de Latidos",
    description: "Privacidad, diferencia con terapia, recursos de crisis. Respuestas honestas.",
    images: ["/opengraph-image"],
  },
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
