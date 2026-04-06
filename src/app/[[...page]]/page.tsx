import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPageDesign from "@/components/home/LandingPageDesign";

export const metadata: Metadata = {
  title: "Tres Mil Millones de Latidos — Tres mil millones de latidos. Haz que cuenten los tuyos.",
  description:
    "El corazón late tres mil millones de veces en una vida. Tres Mil Millones de Latidos existe para que los tuyos tengan dirección real. Mentoría con IA, latido a latido.",
  keywords: [
    "mentor IA",
    "coach inteligencia artificial",
    "superar bloqueo mental",
    "claridad emocional",
    "productividad personal",
    "herramienta bienestar",
    "ansiedad productividad",
    "tresmilmillonesdelatidos",
  ],
  openGraph: {
    title: "Tres Mil Millones de Latidos — Haz que cuenten tus próximos latidos",
    description:
      "Mentoría con IA para jóvenes que saben que algo tiene que cambiar. Latido a latido.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos — Haz que cuenten tus próximos latidos",
    description:
      "Mentoría con IA para jóvenes que saben que algo tiene que cambiar. Latido a latido.",
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
