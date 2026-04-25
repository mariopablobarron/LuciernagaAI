import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require("next-intl/plugin");

const isDev = process.env.NODE_ENV === "development";

// Build version: SHA del commit (si Coolify lo expone) o timestamp como fallback.
// Se inyecta como NEXT_PUBLIC_BUILD_VERSION para que el cliente pueda detectar
// nuevas versiones desplegadas y mostrar banner "recargar".
const BUILD_VERSION =
  process.env.GIT_SHA ||
  process.env.SOURCE_COMMIT ||
  process.env.COOLIFY_GIT_COMMIT_SHA ||
  `t${Date.now()}`;
process.env.NEXT_PUBLIC_BUILD_VERSION = BUILD_VERSION;

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://cdn.jsdelivr.net",
  `connect-src 'self' https://openrouter.ai https://*.sentry.io https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.facebook.com https://accounts.google.com https://oauth2.googleapis.com https://eu.i.posthog.com https://us.i.posthog.com${isDev ? " ws://localhost:3000 ws://127.0.0.1:3000" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
  ...(!isDev ? ["upgrade-insecure-requests"] : []),
];

const contentSecurityPolicy = cspDirectives.join("; ");

const nextConfig: NextConfig = {
  // ============================================
  // PRODUCTION OPTIMIZATIONS
  // ============================================

  // Build ID consistente con BUILD_VERSION (usado por banner "nueva versión")
  generateBuildId: async () => BUILD_VERSION,

  // Disable React strict mode in production (performance)
  reactStrictMode: isDev,

  // Optimize images
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Generate ETags for static assets
  generateEtags: true,

  // Incremental Static Regeneration
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 min
    pagesBufferLength: 5,
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["class-variance-authority"],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        // Global security headers
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        // Static assets with hash — cache aggressively (1 year)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // HTML pages — always revalidate with server
        source: "/((?!api|_next/static).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
      {
        // API-specific: never cache
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.APP_BASE_URL || "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Session-Token, X-Response-Mode",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/registro",
        destination: "/signup",
        permanent: true,
      },
      {
        // Renamed 2026-04: /metodo → /como-funciona (more direct for visitors)
        source: "/metodo",
        destination: "/como-funciona",
        permanent: true,
      },
      {
        // Renamed 2026-04: gender-neutral landing for mental health professionals
        source: "/para-psicologas",
        destination: "/para-profesionales",
        permanent: true,
      },
    ];
  },

  // Rewrites (example)
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Proxy Sentry requests through the app to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI output
  silent: !process.env.CI,
});
