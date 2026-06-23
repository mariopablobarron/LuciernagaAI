import type { Metadata } from "next";
import type { ReactNode } from "react";

// ISR: revalidate cada 24h. Estas páginas cambian poco — el HTML cacheado
// reduce TTFB y carga del VPS. SEO audit 2026-06-23 #8.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Cómo funciona el mentor IA",
  description:
    "Cuéntale lo que te bloquea, sal con un paso concreto. Sin registro para empezar, sin entrenamiento de modelos con tus datos. Supervisión clínica humana.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/como-funciona",
  },
  openGraph: {
    title: "Cómo funciona el mentor IA",
    description:
      "El método: te escucha, detecta tu estado, propone un paso concreto que sí puedes hacer hoy. Anónimo desde el primer mensaje.",
    type: "website",
    url: "https://tresmilmillonesdelatidos.es/como-funciona",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Cómo funciona Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cómo funciona el mentor IA",
    description: "Te escucha, detecta tu estado, propone un paso concreto. Anónimo.",
    images: ["/opengraph-image"],
  },
};

export default function ComoFuncionaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
