import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Calculadora de Latidos — Cuántos ya has gastado",
  description:
    "Tres mil millones de latidos en una vida. Calcula cuántos ya has gastado y cuántos te quedan. Herramienta gratuita.",
  alternates: buildAlternates("/calculadora-latidos"),
};

export default function CalculadoraLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
