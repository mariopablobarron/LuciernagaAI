import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Reto de transformación — Tres Mil Millones de Latidos",
  description:
    "Acepta el reto de 21 días. Check-ins diarios, objetivos personalizados y seguimiento con IA para generar cambios reales.",
  alternates: buildAlternates("/reto"),
  openGraph: {
    title: "Reto de transformación — Tres Mil Millones de Latidos",
    description:
      "Acepta el reto de 21 días. Check-ins diarios, objetivos personalizados y seguimiento con IA para generar cambios reales.",
    type: "website",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reto de transformación — Tres Mil Millones de Latidos",
    description:
      "Acepta el reto de 21 días. Check-ins diarios, objetivos personalizados y seguimiento con IA para generar cambios reales.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RetoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
