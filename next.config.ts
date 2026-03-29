import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ============================================
  // PRODUCTION OPTIMIZATIONS
  // ============================================
  
  // Disable React strict mode in production (performance)
  reactStrictMode: process.env.NODE_ENV === "development",

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
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
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
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // Redirects (example)
  async redirects() {
    return [];
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

export default nextConfig;
