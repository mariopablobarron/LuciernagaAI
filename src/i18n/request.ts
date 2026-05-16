import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";
import { applySiteContentOverrides } from "./overrides";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Si `requestLocale` no viene del segmento [locale] (ej. el usuario está en
  // /etica, /faq, /sobre-nosotros — fuera del segment), leemos la cookie
  // NEXT_LOCALE que el middleware/proxy persiste al visitar /en, /pt, /fr.
  // Sin este fallback, todas las páginas estáticas renderizarían en español
  // incluso si el usuario eligió otro idioma en la home.
  if (!locale) {
    try {
      const cookieStore = await cookies();
      const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
      if (cookieLocale && routing.locales.includes(cookieLocale as (typeof routing.locales)[number])) {
        locale = cookieLocale;
      }
    } catch {
      // cookies() puede fallar en contextos sin request (build, static gen)
    }
  }

  // Type narrowing acepta cualquier locale soportado en routing.ts
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const baseMessages = (await import(`../../messages/${locale}.json`)).default;
  const messages = await applySiteContentOverrides(baseMessages, locale);

  return {
    locale,
    messages,
  };
});
