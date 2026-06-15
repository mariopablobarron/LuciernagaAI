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

  // Configuración por locale: marca, claim SEO, OG locale BCP-47.
  // El default (locale === "" o "es") sirve la versión española sin prefijo URL.
  const SITE_CONFIG = {
    es: {
      name: "Tres Mil Millones de Latidos",
      seoSuffix: "Mentor IA en español, anónimo",
      ogLocale: "es_ES",
      url: "https://tresmilmillonesdelatidos.es",
    },
    en: {
      name: "Three Billion Heartbeats",
      seoSuffix: "AI mentor, anonymous chat",
      ogLocale: "en_US",
      url: "https://tresmilmillonesdelatidos.es/en",
    },
    pt: {
      name: "Três Mil Milhões de Batidas",
      seoSuffix: "Mentor IA em português, anónimo",
      ogLocale: "pt_PT",
      url: "https://tresmilmillonesdelatidos.es/pt",
    },
    fr: {
      name: "Trois Milliards de Battements",
      seoSuffix: "Mentor IA en français, anonyme",
      ogLocale: "fr_FR",
      url: "https://tresmilmillonesdelatidos.es/fr",
    },
    de: {
      name: "Drei Milliarden Herzschläge",
      seoSuffix: "KI-Mentor auf Deutsch, anonym",
      ogLocale: "de_DE",
      url: "https://tresmilmillonesdelatidos.es/de",
    },
  } as const;

  const norm = (locale === "" ? "es" : locale) as keyof typeof SITE_CONFIG;
  const cfg = SITE_CONFIG[norm] ?? SITE_CONFIG.es;
  // Title optimizado SEO: brand + categoría + diferenciador único, ≤60 chars
  // (la frase identitaria "Cuéntale lo que te bloquea / Sal con un paso" se
  // mantiene como H1 visible — no compite con el title del navegador).
  const title = `${cfg.name} · ${cfg.seoSuffix}`;
  const description = t("subtitle");

  return {
    // .absolute evita que el template "%s | Tres Mil Millones de Latidos"
    // del root layout duplique la marca al final.
    title: { absolute: title },
    description,
    alternates: {
      canonical: cfg.url,
      languages: {
        es: SITE_CONFIG.es.url,
        en: SITE_CONFIG.en.url,
        pt: SITE_CONFIG.pt.url,
        fr: SITE_CONFIG.fr.url,
        de: SITE_CONFIG.de.url,
      },
    },
    openGraph: {
      title,
      description,
      siteName: cfg.name,
      type: "website",
      locale: cfg.ogLocale,
      url: cfg.url,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: cfg.name }],
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
  return [{ locale: "es" }, { locale: "en" }, { locale: "pt" }, { locale: "fr" }, { locale: "de" }];
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
