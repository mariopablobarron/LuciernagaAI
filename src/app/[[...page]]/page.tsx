import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPageDesign from "@/components/home/LandingPageDesign";

export const metadata: Metadata = {
  title: "Tres Mil Millones de Latidos — Mentoria con IA en español",
  description:
    "Tres Mil Millones de Latidos es una plataforma de mentoría con inteligencia artificial. Te ayuda a identificar bloqueos, ordenar ideas y actuar hoy con microacciones concretas. Gratis.",
  keywords: [
    "tres mil millones de latidos",
    "tresmilmillonesdelatidos",
    "mentor IA",
    "mentoría inteligencia artificial",
    "coach IA español",
    "desarrollo personal IA",
    "superar bloqueo mental",
    "claridad emocional",
    "bienestar emocional",
    "app salud mental IA",
    "microacciones",
    "Startidea",
    "Mario Pablo Sanchez Barron",
  ],
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es",
  },
  openGraph: {
    title: "Tres Mil Millones de Latidos — Mentoria con IA en español",
    description:
      "Plataforma de mentoría con IA. Detecta tu estado emocional y te guia a la accion concreta. Gratis durante el MVP.",
    url: "https://tresmilmillonesdelatidos.es",
    siteName: "Tres Mil Millones de Latidos",
    type: "website",
    locale: "es_ES",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos — Mentoria con IA en español",
    description:
      "Mentor con IA que detecta tu estado emocional y te guia a la accion concreta. Gratis.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
