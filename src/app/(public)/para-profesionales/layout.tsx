import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Para profesionales — Tres Mil Millones de Latidos",
  description:
    "Un acompañamiento complementario para tus clientes entre sesiones. Panel clínico, detección de riesgo, notas y un marco pedagógico revisado por profesional de la psicología. No sustituye terapia — la refuerza.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/para-profesionales",
  },
  openGraph: {
    title: "Para profesionales — Tres Mil Millones de Latidos",
    description:
      "Un acompañamiento entre sesiones con panel clínico, detección de riesgo y protocolo supervisado clínicamente.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Para profesionales" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Para profesionales — Tres Mil Millones de Latidos",
    description:
      "Un acompañamiento complementario con panel clínico para tu consulta.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function ParaProfesionalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
