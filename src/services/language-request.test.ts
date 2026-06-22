import { detectLanguageRequest, detectMessageLanguage } from "./language-request";

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

describe("detectMessageLanguage — auto-detección del idioma del mensaje", () => {
  test("Mensaje en inglés desde locale=es → detecta en", () => {
    const r = detectMessageLanguage(
      "Hi, how are you today? I've been feeling stuck with my work and I don't know what to do.",
      "es",
    );
    expect(r).toEqual({ detected: true, locale: "en" });
  });

  test("Mensaje en español desde locale=en → detecta es", () => {
    const r = detectMessageLanguage(
      "Hola, estoy un poco perdido. Llevo varios días sin saber qué hacer con esto.",
      "en",
    );
    expect(r).toEqual({ detected: true, locale: "es" });
  });

  test("Mensaje en portugués desde locale=es → detecta pt", () => {
    const r = detectMessageLanguage(
      "Olá, estou um pouco perdido. Não sei o que fazer com isso, sinto-me cansado.",
      "es",
    );
    expect(r).toEqual({ detected: true, locale: "pt" });
  });

  test("Mensaje en alemán desde locale=es → detecta de", () => {
    const r = detectMessageLanguage(
      "Hallo, ich bin sehr müde und weiß nicht, was ich heute tun soll. Können wir reden?",
      "es",
    );
    expect(r).toEqual({ detected: true, locale: "de" });
  });

  test("Mensaje en francés desde locale=es → detecta fr", () => {
    const r = detectMessageLanguage(
      "Bonjour, je suis très fatigué aujourd'hui et je ne sais pas quoi faire avec mon travail.",
      "es",
    );
    expect(r).toEqual({ detected: true, locale: "fr" });
  });

  test("Mensaje en el mismo idioma del locale → NO detecta cambio", () => {
    const r = detectMessageLanguage(
      "Hola, estoy bien hoy, pero tengo dudas sobre el trabajo que estoy haciendo.",
      "es",
    );
    expect(r).toEqual({ detected: false });
  });

  test("Mensajes muy cortos no disparan", () => {
    expect(detectMessageLanguage("Hi", "es")).toEqual({ detected: false });
    expect(detectMessageLanguage("Hello world", "es")).toEqual({ detected: false });
    expect(detectMessageLanguage("", "es")).toEqual({ detected: false });
  });

  test("Mensaje sin stopwords claras (números/símbolos) no dispara", () => {
    const r = detectMessageLanguage("123 456 7890 0000 ::: !!! ???", "es");
    expect(r).toEqual({ detected: false });
  });

  test("Mensaje ambiguo (mezcla idiomas) NO dispara cambio", () => {
    // "ok no" sin contexto adicional puede ser es o en — margen insuficiente
    const r = detectMessageLanguage("ok no problem hola buenas", "es");
    expect(r).toEqual({ detected: false });
  });
});
