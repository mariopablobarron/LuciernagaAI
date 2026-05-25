import { detectLanguageRequest } from "./language-request";

describe("detectLanguageRequest — peticiones explícitas de cambio de idioma", () => {
  test("Caso REAL: 'Em português' estando en español → cambia a pt", () => {
    expect(detectLanguageRequest("Em português", "es")).toEqual({
      changed: true,
      newLocale: "pt",
    });
  });

  test("'Háblame en inglés' estando en español → cambia a en", () => {
    expect(detectLanguageRequest("Háblame en inglés", "es")).toEqual({
      changed: true,
      newLocale: "en",
    });
  });

  test("'en français' estando en español → cambia a fr", () => {
    expect(detectLanguageRequest("Réponds en français por favor", "es")).toEqual({
      changed: true,
      newLocale: "fr",
    });
  });

  test("'Speak English' estando en pt → cambia a en", () => {
    expect(detectLanguageRequest("Speak English please", "pt")).toEqual({
      changed: true,
      newLocale: "en",
    });
  });

  test("Vuelta al español: 'háblame en español' desde inglés → cambia a es", () => {
    expect(detectLanguageRequest("Reply in spanish please", "en")).toEqual({
      changed: true,
      newLocale: "es",
    });
  });

  test("Idéntico al actual → NO cambia", () => {
    expect(detectLanguageRequest("Speak English", "en")).toEqual({ changed: false });
    expect(detectLanguageRequest("Em português", "pt")).toEqual({ changed: false });
  });

  test("Mensajes normales sin petición de idioma → NO cambia", () => {
    expect(detectLanguageRequest("Hola, ¿cómo estás?", "es")).toEqual({ changed: false });
    expect(detectLanguageRequest("Me siento mal", "es")).toEqual({ changed: false });
    expect(detectLanguageRequest("estoy en Madrid hoy", "es")).toEqual({ changed: false });
  });

  test("Mensajes muy cortos no disparan", () => {
    expect(detectLanguageRequest("", "es")).toEqual({ changed: false });
    expect(detectLanguageRequest("en", "es")).toEqual({ changed: false });
  });
});
