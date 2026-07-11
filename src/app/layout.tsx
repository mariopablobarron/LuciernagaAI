import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import ThirdPartyScripts from "@/components/ThirdPartyScripts";
import UtmCapture from "@/components/UtmCapture";
import CookieConsent from "@/components/CookieConsent";
import InstallPWA from "@/components/InstallPWA";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import UsageTracker from "@/components/UsageTracker";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import { FontSizeShortcuts } from "@/components/FontSizeShortcuts";
import TopProgressBar from "@/components/TopProgressBar";
import { Toaster } from "@/components/ui/sonner";
import { SAAS_CONFIG } from "@/lib/saas";
import { validateEnv } from "@/lib/env";
import "./globals.css";

// Fail fast on missing critical env vars (throws in prod, warns in dev)
validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

function getMetadataBase(): URL {
  const configuredBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  try {
    return new URL(configuredBaseUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  verification: {
    google: "X1wK9qLyt2L99gHGjvFlj4qlOR8jc_abOlDZc9JGFb0",
  },
  title: {
    default: "Tres Mil Millones de Latidos — Mentoría con IA en español",
    template: "%s | Tres Mil Millones de Latidos",
  },
  description:
    "Tres Mil Millones de Latidos es una plataforma de mentoría con inteligencia artificial. Te ayuda a identificar bloqueos, ordenar ideas y actuar hoy con microacciones concretas. Gratis.",
  keywords: [
    "tres mil millones de latidos",
    "mentoría IA",
    "coach IA español",
    "mentor inteligencia artificial",
    "desarrollo personal IA",
    "autoconocimiento",
    "claridad emocional",
    "bloqueo emocional",
    "microacciones",
    "bienestar emocional",
    "Startidea",
  ],
  authors: [{ name: "Mario Pablo Sanchez Barron", url: "https://startidea.es" }],
  creator: "Startidea",
  publisher: "Tres Mil Millones de Latidos",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es",
    languages: {
      "es": "https://tresmilmillonesdelatidos.es",
      "en": "https://tresmilmillonesdelatidos.es/en",
      "pt": "https://tresmilmillonesdelatidos.es/pt",
      "fr": "https://tresmilmillonesdelatidos.es/fr",
      "de": "https://tresmilmillonesdelatidos.es/de",
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Latidos",
  },
  openGraph: {
    title: "Tres Mil Millones de Latidos — Mentoría con IA en español",
    description:
      "Plataforma de mentoría con inteligencia artificial. Claridad emocional, acción real y seguimiento continuo. Gratis durante el MVP.",
    url: "https://tresmilmillonesdelatidos.es",
    siteName: "Tres Mil Millones de Latidos",
    locale: "es_ES",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Tres Mil Millones de Latidos — Mentoría con IA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos — Mentoría con IA en español",
    description: "Mentor con IA que detecta tu estado emocional y te guía a la acción concreta. Gratis.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tresmilmillonesdelatidos.es/#organization",
      name: "Startidea",
      alternateName: "Tres Mil Millones de Latidos",
      url: "https://startidea.es",
      description:
        "Agencia de innovación social y desarrollo tecnológico con más de 15 años de experiencia.",
      foundingDate: "2011",
      founder: { "@id": "https://tresmilmillonesdelatidos.es/#founder" },
    },
    {
      "@type": "Person",
      "@id": "https://tresmilmillonesdelatidos.es/#founder",
      name: "Mario Pablo Sanchez Barron",
      jobTitle: "Fundador",
      worksFor: { "@id": "https://tresmilmillonesdelatidos.es/#organization" },
      url: "https://tresmilmillonesdelatidos.es/sobre-nosotros",
    },
    {
      // Multi-type: SoftwareApplication + WebApplication mejora elegibilidad
      // para rich results (HealthApplication category + browserRequirements
      // específicos de WebApplication).
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": "https://tresmilmillonesdelatidos.es/#app",
      name: "Tres Mil Millones de Latidos",
      url: "https://tresmilmillonesdelatidos.es",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, Telegram",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          name: "Free",
          description: "Conversaciones sin límite con el mentor IA. Check-in diario, objetivos y acciones. Sin tarjeta.",
        },
        {
          "@type": "Offer",
          price: "9",
          priceCurrency: "EUR",
          name: "Pro",
          description: "Continuidad cross-device, memoria persistente entre sesiones, Modo Impulso y prioridad.",
        },
      ],
      provider: { "@id": "https://tresmilmillonesdelatidos.es/#organization" },
      author: { "@id": "https://tresmilmillonesdelatidos.es/#founder" },
      inLanguage: ["es", "en", "pt", "fr", "de"],
      description:
        "Tres Mil Millones de Latidos es una plataforma de mentoría con inteligencia artificial. Detecta tu estado emocional y te guía a la acción concreta con microacciones de 10 minutos. Disponible en español, inglés, portugués, francés y alemán.",
    },
    {
      "@type": "WebSite",
      "@id": "https://tresmilmillonesdelatidos.es/#website",
      url: "https://tresmilmillonesdelatidos.es",
      name: "Tres Mil Millones de Latidos",
      alternateName: "3000 millones de latidos",
      publisher: { "@id": "https://tresmilmillonesdelatidos.es/#organization" },
      inLanguage: "es",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://tresmilmillonesdelatidos.es/app?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Apply a11y classes before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem("a11y-preferences")||"{}");var c=document.documentElement.classList;if(p.fontSize>0)c.add("a11y-font-"+p.fontSize);if(p.highContrast)c.add("a11y-high-contrast");if(p.reducedMotion)c.add("a11y-reduced-motion");if(p.dyslexiaFont)c.add("a11y-dyslexia-font");if(p.linkHighlight)c.add("a11y-link-highlight");if(p.bigCursor)c.add("a11y-big-cursor");if(p.textSpacing)c.add("a11y-text-spacing");}catch(e){}})();`,
          }}
        />
        {/* Sin JS, los bloques [data-reveal] (scroll-reveal) quedarían
            atrapados en opacity:0 y la página se vería en negro. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip-to-content for keyboard/screen-reader users */}
        <a href="#main-content" className="a11y-skip-link">
          Saltar al contenido principal
        </a>

        <ThirdPartyScripts />
        <UtmCapture />
        <ServiceWorkerRegistrar />
        <UsageTracker />
        <TopProgressBar />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>

            {/* Screen reader announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer" />

            <AccessibilityWidget />
            {/* Atajos de teclado Ctrl/Cmd +/-/0 para cambiar tamaño de fuente.
                Toast efímero global montado una sola vez aquí. */}
            <FontSizeShortcuts />
            <CookieConsent />
            <InstallPWA />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
