import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { applySiteContentOverrides } from "./overrides";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

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
