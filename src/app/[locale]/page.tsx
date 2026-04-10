import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LandingPageI18n from "@/components/home/LandingPageI18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  const isSpanish = locale === "es" || locale === "";
  const siteName = isSpanish ? "Tres Mil Millones de Latidos" : "Three Billion Heartbeats";
  const title = `${siteName} — ${t("title")} ${t("titleHighlight")}`;
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

  return <LandingPageI18n />;
}
