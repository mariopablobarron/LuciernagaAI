import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl middleware:
 *   - Persiste el cookie NEXT_LOCALE cuando el usuario visita /en, /pt o /fr
 *     (basado en el path segment, no en Accept-Language porque routing tiene
 *     localeDetection: false).
 *   - Permite que páginas FUERA del segment [locale] (como /etica, /faq, etc.)
 *     resuelvan `requestLocale` desde la cookie y renderen en el idioma que
 *     el usuario eligió en la home.
 *   - Sin esto, `useTranslations()` en /etica siempre devolvería español
 *     (default), aunque el usuario haya entrado a /pt previamente.
 */
export default createMiddleware(routing);

export const config = {
  // Aplicar a todas las páginas excepto:
  //   - /api: rutas API (no necesitan i18n routing)
  //   - /_next, /_vercel: assets internos de Next/Vercel
  //   - Archivos con extensión (.txt, .png, .ico, etc.): assets estáticos
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
