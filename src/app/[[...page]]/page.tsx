import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPageDesign from "@/components/home/LandingPageDesign";

export const metadata: Metadata = {
  title: "Luciérnaga AI — Mentoría con IA para salir del bloqueo y avanzar",
  description:
    "Luciérnaga detecta si estás bloqueado, ansioso o perdido y te da un próximo paso concreto. Conversaciones orientadas a acción, no a charla. Gratis.",
  keywords: [
    "mentor IA",
    "coach inteligencia artificial",
    "superar bloqueo mental",
    "claridad emocional",
    "productividad personal",
    "herramienta bienestar",
    "ansiedad productividad",
  ],
  openGraph: {
    title: "Luciérnaga AI — Salir del bloqueo con IA",
    description:
      "Detecta tu estado mental y recibe un próximo paso concreto. Sin registro. En 2 minutos.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Luciérnaga AI — Salir del bloqueo con IA",
    description:
      "Detecta tu estado mental y recibe un próximo paso concreto. Sin registro. En 2 minutos.",
  },
  robots: { index: true, follow: true },
};

// Routes managed by the app — the catch-all must never intercept these
const BLOCKED_SEGMENTS = new Set([
  "app",
  "explore",
  "admin",
  "dashboard",
  "impulso",
  "api",
  "editor",
]);

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const { page: segments } = await params;

  if (segments?.[0] && BLOCKED_SEGMENTS.has(segments[0])) {
    notFound();
  }

  const urlPath = "/" + (segments?.join("/") ?? "");

  if (urlPath === "/") {
    return <LandingPageDesign />;
  }

  notFound();
}
