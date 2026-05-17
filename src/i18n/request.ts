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

  // Fallback automático a español para keys faltantes (común tras refactor
  // donde se añaden keys nuevas y aún no se ejecutó pnpm i18n:sync). Hacemos
  // un deep-merge con es.json como base — si la key existe en el destino,
  // gana el destino; si no, cae al español. Evita ver paths crudos como
  // "sidebar.workspace" en la UI cuando el sync no se ha corrido todavía.
  let mergedMessages = messages;
  if (locale !== routing.defaultLocale) {
    const fallback = (await import(`../../messages/${routing.defaultLocale}.json`)).default;
    mergedMessages = deepMerge(fallback as Record<string, unknown>, messages as Record<string, unknown>);
  }

  return {
    locale,
    messages: mergedMessages,
  };
});

/**
 * Merge profundo: target gana sobre source en strings, pero hereda de source
 * las keys/sub-keys que target no tiene. Solo recursa en objetos planos —
 * arrays y primitivos los reemplaza.
 */
function deepMerge(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...source };
  for (const [key, value] of Object.entries(target)) {
    const existing = source[key];
    if (
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
