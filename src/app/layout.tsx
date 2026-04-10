import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";
import UtmCapture from "@/components/UtmCapture";
import CookieConsent from "@/components/CookieConsent";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import AccessibilityWidget from "@/components/AccessibilityWidget";
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
    default: "Tres Mil Millones de Latidos — Mentoria con IA en español",
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
    title: "Tres Mil Millones de Latidos — Mentoria con IA en español",
    description:
      "Plataforma de mentoría con inteligencia artificial. Claridad emocional, accion real y seguimiento continuo. Gratis durante el MVP.",
    url: "https://tresmilmillonesdelatidos.es",
    siteName: "Tres Mil Millones de Latidos",
    locale: "es_ES",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Tres Mil Millones de Latidos — Mentoria con IA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres Mil Millones de Latidos — Mentoria con IA en español",
    description: "Mentor con IA que detecta tu estado emocional y te guia a la accion concreta. Gratis.",
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
      "@type": "SoftwareApplication",
      "@id": "https://tresmilmillonesdelatidos.es/#app",
      name: "Tres Mil Millones de Latidos",
      url: "https://tresmilmillonesdelatidos.es",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, Telegram",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          name: "Free",
          description: "10 conversaciones al mes, check-in diario, objetivos y acciones.",
        },
        {
          "@type": "Offer",
          price: "9",
          priceCurrency: "EUR",
          name: "Pro",
          description: "Conversaciones ilimitadas, Modo Impulso 21 dias, retos personalizados y journeys completos.",
        },
      ],
      provider: { "@id": "https://tresmilmillonesdelatidos.es/#organization" },
      author: { "@id": "https://tresmilmillonesdelatidos.es/#founder" },
      inLanguage: ["es", "en"],
      description:
        "Tres Mil Millones de Latidos es una plataforma de mentoría con inteligencia artificial. Detecta tu estado emocional y te guia a la accion concreta con microacciones de 10 minutos.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip-to-content for keyboard/screen-reader users */}
        <a href="#main-content" className="a11y-skip-link">
          Saltar al contenido principal
        </a>

        <Analytics />
        <MetaPixel />
        <UtmCapture />
        <ServiceWorkerRegistrar />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>

          {/* Screen reader announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer" />

          <AccessibilityWidget />
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
