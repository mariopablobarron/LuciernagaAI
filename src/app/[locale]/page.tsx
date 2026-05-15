import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LandingPageI18n from "@/components/home/LandingPageI18n";
import { resolveMedia } from "@/i18n/media";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  const isSpanish = locale === "es" || locale === "";
  const siteName = isSpanish ? "Tres Mil Millones de Latidos" : "Three Billion Heartbeats";
  // Title optimizado SEO: brand + categoría + diferenciador único, ≤60 chars
  // (la frase identitaria "Cuéntale lo que te bloquea / Sal con un paso" se
  // mantiene como H1 visible — no compite con el title del navegador).
  const title = isSpanish
    ? `${siteName} · Mentor IA en español, anónimo`
    : `${siteName} · AI mentor, anonymous chat`;
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: {
      canonical: isSpanish
        ? "https://tresmilmillonesdelatidos.es"
        : `https://tresmilmillonesdelatidos.es/${locale}`,
      languages: {
        es: "https://tresmilmillonesdelatidos.es",
        en: "https://tresmilmillonesdelatidos.es/en",
      },
    },
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
      locale: isSpanish ? "es_ES" : "en_US",
      url: isSpanish
        ? "https://tresmilmillonesdelatidos.es"
        : `https://tresmilmillonesdelatidos.es/${locale}`,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export function generateStaticParams() {
  return [{ locale: "es" }, { locale: "en" }];
}

export default async function LocaleLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [founderPhoto, advisorPhoto] = await Promise.all([
    resolveMedia("team-founder"),
    resolveMedia("team-advisor"),
  ]);

  return (
    <LandingPageI18n
      founderPhotoUrl={founderPhoto.url ?? "/team/mario.png"}
      advisorPhotoUrl={advisorPhoto.url}
    />
  );
}
