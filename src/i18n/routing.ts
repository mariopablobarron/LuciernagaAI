import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Locales soportados:
  //   - es: español de España (default, sin prefijo URL)
  //   - en: inglés (US/UK genérico)
  //   - pt: portugués de Portugal (PT-PT) — léxico, ortografía y crisis Portugal
  //   - fr: francés de Francia (FR-FR)
  //   - de: alemán (Alemania) — Du-Form (informal), crisis Telefonseelsorge
  // Para añadir variantes regionales adicionales (pt-BR, fr-CA, etc.) habría que
  // refactorizar el matching plano y duplicar los archivos de mensajes.
  locales: ["es", "en", "pt", "fr", "de"],
  defaultLocale: "es",
  localePrefix: "as-needed", // / = Spanish. /en, /pt, /fr, /de para los demás.
  localeDetection: false, // Sin auto-redirect por idioma del navegador
});
