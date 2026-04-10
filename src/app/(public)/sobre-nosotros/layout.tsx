import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre nosotros — Tres Mil Millones de Latidos | Startidea",
  description:
    "Tres Mil Millones de Latidos nace de Startidea, agencia con 15 anos de experiencia en innovacion social. Combinamos IA, psicologia del comportamiento y acompanamiento real para crear un mentor que hace las preguntas que no te estas haciendo.",
  openGraph: {
    title: "Sobre nosotros — Tres Mil Millones de Latidos",
    description:
      "La tecnologia puede acompanar sin sustituir lo humano. Conoce de donde surge este proyecto y quien esta detras.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre nosotros — Tres Mil Millones de Latidos",
    description:
      "Startidea: 15 anos de innovacion social. Tres Mil Millones de Latidos: un mentor con IA que hace las preguntas que no te estas haciendo.",
  },
  robots: { index: true, follow: true },
};

export default function SobreNosotrosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
