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

  return {
    title: `Three Billion Heartbeats — ${t("title")} ${t("titleHighlight")}`,
    description: t("subtitle"),
    openGraph: {
      title: `Three Billion Heartbeats — ${t("title")} ${t("titleHighlight")}`,
      description: t("subtitle"),
      type: "website",
      locale: locale === "en" ? "en_US" : "es_ES",
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
