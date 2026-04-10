import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre nosotros — Tres Mil Millones de Latidos | Mario Pablo Sanchez Barron",
  description:
    "Tres Mil Millones de Latidos nace de Startidea, creada por Mario Pablo Sanchez Barron. 15 anos de experiencia en innovacion social. Combinamos IA, psicologia del comportamiento y acompanamiento real.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/sobre-nosotros",
  },
  openGraph: {
    title: "Sobre nosotros — Tres Mil Millones de Latidos",
    description:
      "Conoce a Mario Pablo Sanchez Barron y Startidea, la agencia detras de Tres Mil Millones de Latidos. 15 anos de innovacion social.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Sobre nosotros — Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre nosotros — Tres Mil Millones de Latidos",
    description:
      "Mario Pablo Sanchez Barron y Startidea: 15 anos de innovacion social. Tres Mil Millones de Latidos: un mentor con IA.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function SobreNosotrosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
