import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed", // / = Spanish (default), /en = English. No /es prefix.
  localeDetection: false, // Don't auto-redirect based on browser language
});
