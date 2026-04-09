import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";
import UtmCapture from "@/components/UtmCapture";
import CookieConsent from "@/components/CookieConsent";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
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
  title: SAAS_CONFIG.marketingTitle,
  description: SAAS_CONFIG.description,
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
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    images: ["/opengraph-image"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "#organization",
      name: "Tres Mil Millones de Latidos",
      url: "https://tresmilmillonesdelatidos.es",
      description:
        "Plataforma de mentoría conversacional con inteligencia artificial. Claridad emocional, acción real y seguimiento continuo.",
      foundingDate: "2025",
      sameAs: [],
    },
    {
      "@type": "WebApplication",
      "@id": "#app",
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
          description:
            "10 conversaciones al mes, check-in diario, objetivos y acciones.",
        },
        {
          "@type": "Offer",
          price: "9",
          priceCurrency: "EUR",
          name: "Pro",
          description:
            "Conversaciones ilimitadas, Modo Impulso 21 días, retos personalizados y journeys completos.",
        },
      ],
      provider: { "@id": "#organization" },
      inLanguage: "es",
      description:
        "Mentor con IA que detecta tu estado emocional y te guía a la acción concreta. Objetivos, check-ins diarios, retos de 21 días y seguimiento continuo.",
    },
    {
      "@type": "WebSite",
      "@id": "#website",
      url: "https://tresmilmillonesdelatidos.es",
      name: "Tres Mil Millones de Latidos",
      publisher: { "@id": "#organization" },
      inLanguage: "es",
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
      </head>
      <body className="min-h-full flex flex-col">
        <Analytics />
        <MetaPixel />
        <UtmCapture />
        <ServiceWorkerRegistrar />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
