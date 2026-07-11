import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import LandingPageI18n from "@/components/home/LandingPageI18n";
import { resolveMedia } from "@/i18n/media";

// ISR: revalidate cada 1h. La home cambia más que las páginas internas
// (testimonios, contadores). 1h equilibra freshness vs hits al VPS.
// SEO audit 2026-06-23 #8.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Configuración por locale: marca, claim SEO, OG locale BCP-47.
  // El default (locale === "" o "es") sirve la versión española sin prefijo URL.
  const SITE_CONFIG = {
    es: {
      name: "Tres Mil Millones de Latidos",
      seoSuffix: "Mentor IA en español, anónimo",
      ogLocale: "es_ES",
      url: "https://tresmilmillonesdelatidos.es",
      metaDescription:
        "Mentor con IA en español, anónimo desde el primer mensaje. Identifica lo que te bloquea y sal con un paso concreto para hoy. Gratis, con supervisión clínica.",
    },
    en: {
      name: "Three Billion Heartbeats",
      seoSuffix: "AI mentor, anonymous chat",
      ogLocale: "en_US",
      url: "https://tresmilmillonesdelatidos.es/en",
      metaDescription:
        "AI mentor in English, anonymous from the first message. Spot what's blocking you and leave with one concrete next step for today. Free, clinically supervised.",
    },
    pt: {
      name: "Três Mil Milhões de Batidas",
      seoSuffix: "Mentor IA em português, anónimo",
      ogLocale: "pt_PT",
      url: "https://tresmilmillonesdelatidos.es/pt",
      metaDescription:
        "Mentor com IA em português, anónimo desde a primeira mensagem. Identifica o que te bloqueia e sai com um passo concreto para hoje. Grátis, com supervisão clínica.",
    },
    fr: {
      name: "Trois Milliards de Battements",
      seoSuffix: "Mentor IA en français, anonyme",
      ogLocale: "fr_FR",
      url: "https://tresmilmillonesdelatidos.es/fr",
      metaDescription:
        "Mentor IA en français, anonyme dès le premier message. Identifie ce qui te bloque et repars avec une action concrète pour aujourd'hui. Gratuit, suivi clinique.",
    },
    de: {
      name: "Drei Milliarden Herzschläge",
      seoSuffix: "KI-Mentor auf Deutsch, anonym",
      ogLocale: "de_DE",
      url: "https://tresmilmillonesdelatidos.es/de",
      metaDescription:
        "KI-Mentor auf Deutsch, anonym ab der ersten Nachricht. Erkenne, was dich blockiert, und geh mit einem konkreten Schritt für heute. Kostenlos, klinisch begleitet.",
    },
  } as const;

  const norm = (locale === "" ? "es" : locale) as keyof typeof SITE_CONFIG;
  const cfg = SITE_CONFIG[norm] ?? SITE_CONFIG.es;
  // Title optimizado SEO: brand + categoría + diferenciador único, ≤60 chars
  // (la frase identitaria "Cuéntale lo que te bloquea / Sal con un paso" se
  // mantiene como H1 visible — no compite con el title del navegador).
  const title = `${cfg.name} · ${cfg.seoSuffix}`;
  // Meta description dedicada (~155 chars) en vez de hero.subtitle (~330, se
  // trunca en SERP). El subtitle sigue siendo el copy visible del hero.
  const description = cfg.metaDescription;

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
