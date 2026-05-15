import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Locales soportados:
  //   - es: español de España (default, sin prefijo URL)
  //   - en: inglés (US/UK genérico)
  //   - pt: portugués de Brasil (mercado mayor, 200M+)
  //   - fr: francés de Francia
  // Para añadir variantes regionales (pt-PT, fr-CA, etc.) habría que refactorizar
  // el matching plano actual (locale === "es") y duplicar archivos de mensajes.
  locales: ["es", "en", "pt", "fr"],
  defaultLocale: "es",
  localePrefix: "as-needed", // / = Spanish. /en, /pt, /fr para los demás.
  localeDetection: false, // Sin auto-redirect por idioma del navegador
});
