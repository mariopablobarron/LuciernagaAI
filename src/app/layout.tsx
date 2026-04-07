import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";
import UtmCapture from "@/components/UtmCapture";
import CookieConsent from "@/components/CookieConsent";
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
    apple: "/favicon.ico",
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
      <body className="min-h-full flex flex-col">
        <Analytics />
        <MetaPixel />
        <UtmCapture />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
