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

  // ── Alemán — caso REAL 2026-06-24 ─────────────────────────────────────
  // Usuario escribió "ab jetzt antworte immer auf deutsch" y el coach
  // respondía en inglés inventándose que no podía hablar alemán.

  test("Caso REAL: 'ab jetzt antworte immer auf deutsch' (desde en) → de", () => {
    expect(detectLanguageRequest("ab jetzt antworte immer auf deutsch", "en")).toEqual({
      changed: true,
      newLocale: "de",
    });
  });

  test("'sprich deutsch' (desde es) → de", () => {
    expect(detectLanguageRequest("kannst du sprich deutsch bitte", "es")).toEqual({
      changed: true,
      newLocale: "de",
    });
  });

  test("'in German please' (desde es) → de", () => {
    expect(detectLanguageRequest("answer in German please", "es")).toEqual({
      changed: true,
      newLocale: "de",
    });
  });

  test("'háblame en alemán' (desde es) → de", () => {
    expect(detectLanguageRequest("por favor háblame en alemán", "es")).toEqual({
      changed: true,
      newLocale: "de",
    });
  });

  test("'auf englisch' desde de → en (alemán pidiendo inglés)", () => {
    expect(detectLanguageRequest("antworte auf englisch", "de")).toEqual({
      changed: true,
      newLocale: "en",
    });
  });

  test("Petición de alemán estando ya en de → NO cambia", () => {
    expect(detectLanguageRequest("antworte auf deutsch", "de")).toEqual({ changed: false });
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

  test("Mensajes cortos ambiguos (no saludo) no disparan", () => {
    // "ok" es ambiguo entre idiomas y NO es saludo → no dispara.
    expect(detectMessageLanguage("ok", "es")).toEqual({ detected: false });
    // "Hello world" no es saludo exacto (greeting requiere mensaje entero) y
    // "hello" solo da 1 match de stopword (<2 umbral) → no dispara.
    expect(detectMessageLanguage("Hello world", "es")).toEqual({ detected: false });
    expect(detectMessageLanguage("", "es")).toEqual({ detected: false });
  });

  test("'Hi' solo (saludo inglés inequívoco) SÍ dispara → en", () => {
    // Edge case que arreglamos: "hi"/"hello" como mensaje único debe
    // cambiar idioma instant aunque sea 1 palabra (fast-path saludos).
    expect(detectMessageLanguage("Hi", "es")).toEqual({ detected: true, locale: "en" });
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

  // ── Fast-path saludos cortos ──────────────────────────────────────────
  // Edge case observado 23-jun-2026: usuaria inglesa empieza con "hello",
  // recibe respuesta en español por defecto del UI. Fast-path GREETING_HINTS.

  test("'hello' solo (locale=es) → detecta en", () => {
    expect(detectMessageLanguage("hello", "es")).toEqual({ detected: true, locale: "en" });
  });

  test("'hi!' (locale=es) → detecta en", () => {
    expect(detectMessageLanguage("hi!", "es")).toEqual({ detected: true, locale: "en" });
  });

  test("'hola' (locale=en) → detecta es", () => {
    expect(detectMessageLanguage("hola", "en")).toEqual({ detected: true, locale: "es" });
  });

  test("'bonjour' (locale=es) → detecta fr", () => {
    expect(detectMessageLanguage("bonjour", "es")).toEqual({ detected: true, locale: "fr" });
  });

  test("'hallo' (locale=es) → detecta de", () => {
    expect(detectMessageLanguage("hallo", "es")).toEqual({ detected: true, locale: "de" });
  });

  test("'olá' (locale=es) → detecta pt", () => {
    expect(detectMessageLanguage("olá", "es")).toEqual({ detected: true, locale: "pt" });
  });

  test("Saludo en el mismo locale → NO cambia", () => {
    expect(detectMessageLanguage("hola", "es")).toEqual({ detected: false });
    expect(detectMessageLanguage("hello", "en")).toEqual({ detected: false });
  });

  test("Texto largo que empieza con saludo NO usa fast-path (cae a stopwords)", () => {
    // "hello, how are you doing today my friend" — más de 20 chars trimmed,
    // así que fast-path no aplica; pero stopword detection sí debería pillar EN.
    const r = detectMessageLanguage("hello, how are you doing today my friend", "es");
    expect(r).toEqual({ detected: true, locale: "en" });
  });
});
