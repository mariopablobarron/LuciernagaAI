import { test, expect } from "@playwright/test";

/**
 * Tests E2E del cambio de idioma.
 *
 * Cubre:
 *  - Cookie-driven rendering: la cookie NEXT_LOCALE controla el idioma
 *    de todas las páginas fuera del segmento [locale].
 *  - Persistencia cross-navigation: la cookie sobrevive entre páginas.
 *  - LocaleSwitcher: el componente cambia cookie + refresca contenido.
 *  - API /api/user/locale: anónimo devuelve persisted:false sin error.
 *
 * NO cubre (intencionalmente):
 *  - Persistencia en User.locale de BD: requiere sesión auth real + Prisma.
 *    Cubrirlo desde unit tests (mocking Prisma) es más fiable que un E2E.
 *  - Detalles de re-render del segmento [locale]: separado del switcher.
 *
 * Strings de assertion: usamos el botón "Continuar con Google / Continue
 * with Google / Continuer avec Google / Continuar com Google" en /login
 * porque (a) los 4 idiomas tienen texto distinto, (b) es estable (no es
 * marketing copy volátil), (c) /login no requiere auth.
 */

const LOGIN_BUTTON_BY_LOCALE: Record<string, RegExp> = {
  es: /Continuar con Google/i,
  en: /Continue with Google/i,
  fr: /Continuer avec Google/i,
  pt: /Continuar com Google/i,
};

test.describe("i18n — Cookie-driven rendering en /login", () => {
  for (const [locale, expected] of Object.entries(LOGIN_BUTTON_BY_LOCALE)) {
    test(`Cookie NEXT_LOCALE=${locale} renderiza /login en ${locale}`, async ({ context, page }) => {
      await context.addCookies([
        {
          name: "NEXT_LOCALE",
          value: locale,
          domain: "localhost",
          path: "/",
        },
      ]);
      await page.goto("/login");
      await expect(page.getByText(expected).first()).toBeVisible({ timeout: 10_000 });
    });
  }
});

test.describe("i18n — LocaleSwitcher cambia cookie y refresca contenido", () => {
  test("Anonymous: switch ES → EN actualiza cookie + texto en /login", async ({ context, page }) => {
    // Partimos de ES explícito para evitar depender del default del navegador.
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "es", domain: "localhost", path: "/" },
    ]);
    await page.goto("/login");
    await expect(page.getByText(LOGIN_BUTTON_BY_LOCALE.es).first()).toBeVisible({
      timeout: 10_000,
    });

    // Abrir el switcher: botón con aria-label "Idioma actual: ..."
    const switcherToggle = page
      .getByRole("button", { name: /Idioma actual/i })
      .first();
    await expect(switcherToggle).toBeVisible({ timeout: 5_000 });
    await switcherToggle.click();

    // Seleccionar English desde el listbox
    const englishOption = page.getByRole("option", { name: /English/i });
    await englishOption.click();

    // El contenido debe haber cambiado a inglés sin recarga manual.
    await expect(page.getByText(LOGIN_BUTTON_BY_LOCALE.en).first()).toBeVisible({
      timeout: 10_000,
    });

    // Y la cookie debe reflejar el nuevo locale.
    const cookies = await context.cookies();
    const nextLocale = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(nextLocale?.value).toBe("en");
  });
});

test.describe("i18n — Persistencia cross-navigation", () => {
  test("Cookie PT persiste entre /login y /signup", async ({ context, page }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "pt", domain: "localhost", path: "/" },
    ]);

    await page.goto("/login");
    await expect(page.getByText(LOGIN_BUTTON_BY_LOCALE.pt).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/signup");
    // En /signup también debería renderizarse en PT — no probamos la misma
    // string (el botón puede no existir aquí), sino que la cookie sigue puesta.
    const cookies = await context.cookies();
    const nextLocale = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(nextLocale?.value).toBe("pt");
  });
});

test.describe("i18n — API /api/user/locale", () => {
  test("Anonymous POST devuelve {ok:true, persisted:false}", async ({ request }) => {
    const res = await request.post("/api/user/locale", {
      data: { locale: "fr" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Anonymous: nada que persistir en BD; ok pero persisted=false.
    expect(body.persisted).toBe(false);
  });

  test("POST con locale inválido cae en default sin romper", async ({ request }) => {
    // pickEmailLocale normaliza locales desconocidos a "es". Anonymous: ok.
    const res = await request.post("/api/user/locale", {
      data: { locale: "xx" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
