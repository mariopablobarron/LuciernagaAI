import { assessInputQuality, buildAmbiguousInputResponse } from "./input-quality";

describe("assessInputQuality — casos REALES de la auditoría 2026-05-25", () => {
  test("Convo 3: 'Hoka' → too_short (4 chars)", () => {
    expect(assessInputQuality("Hoka")).toEqual({ kind: "too_short", chars: 4 });
  });

  test("Convo 3: 'Hzhshdhs' → gibberish (no_vowels)", () => {
    expect(assessInputQuality("Hzhshdhs")).toEqual({
      kind: "gibberish",
      reason: "no_vowels",
    });
  });

  test("Convo 3: 'No lo se' → ok (es un mensaje válido aunque breve)", () => {
    expect(assessInputQuality("No lo se")).toEqual({ kind: "ok" });
  });

  test("Convo 5: 'Bom dia' → ok", () => {
    expect(assessInputQuality("Bom dia")).toEqual({ kind: "ok" });
  });
});

describe("assessInputQuality — empty / whitespace", () => {
  test("string vacío → empty:blank", () => {
    expect(assessInputQuality("")).toEqual({ kind: "empty", reason: "blank" });
  });

  test("solo espacios → empty:whitespace_only", () => {
    expect(assessInputQuality("   ")).toEqual({ kind: "empty", reason: "blank" });
  });

  test("solo tabs y newlines → empty", () => {
    expect(assessInputQuality("\n\t  \n")).toEqual({ kind: "empty", reason: "blank" });
  });
});

describe("assessInputQuality — respuestas cortas válidas", () => {
  test("'sí', 'no', 'ok' → ambiguous_short_reply (no gibberish, contexto importa)", () => {
    expect(assessInputQuality("sí")).toEqual({ kind: "ambiguous_short_reply", word: "sí" });
    expect(assessInputQuality("no")).toEqual({ kind: "ambiguous_short_reply", word: "no" });
    expect(assessInputQuality("ok")).toEqual({ kind: "ambiguous_short_reply", word: "ok" });
    expect(assessInputQuality("yes")).toEqual({ kind: "ambiguous_short_reply", word: "yes" });
    expect(assessInputQuality("oui")).toEqual({ kind: "ambiguous_short_reply", word: "oui" });
  });

  test("respuesta válida con case mixto", () => {
    expect(assessInputQuality("Sí")).toEqual({ kind: "ambiguous_short_reply", word: "sí" });
    expect(assessInputQuality("OK")).toEqual({ kind: "ambiguous_short_reply", word: "ok" });
  });
});

describe("assessInputQuality — gibberish heurísticas", () => {
  test("'aaaaaaa' → gibberish:repeated_char", () => {
    expect(assessInputQuality("aaaaaaa")).toEqual({
      kind: "gibberish",
      reason: "repeated_char",
    });
  });

  test("'lolololololo' → gibberish:repeated_char", () => {
    expect(assessInputQuality("lolololololo")).toEqual({
      kind: "gibberish",
      reason: "repeated_char",
    });
  });

  test("'ksjdfh' → gibberish:no_vowels", () => {
    expect(assessInputQuality("ksjdfh")).toEqual({
      kind: "gibberish",
      reason: "no_vowels",
    });
  });

  test("'qwertyuiop' (todo consonantes seguidas sin sentido) → gibberish:no_vowels o repeated_char", () => {
    // qwertyuiop tiene vocales (e,u,i,o) así que no_vowels NO dispara.
    // Pero el patrón "tecleo de teclado" no se detecta con heurísticas
    // simples. Aceptamos que pase como ok — el LLM lo manejará.
    expect(assessInputQuality("qwertyuiop").kind).toBe("ok");
  });

  test("input solo de números/símbolos cortos pasa como too_short", () => {
    // '123' es ambiguo pero no es gibberish; cae en too_short.
    expect(assessInputQuality("123")).toEqual({ kind: "too_short", chars: 3 });
  });
});

describe("assessInputQuality — NO falsos positivos en texto humano real", () => {
  test("mensajes normales pasan como ok", () => {
    expect(assessInputQuality("Necesito tomar una decisión importante")).toEqual({ kind: "ok" });
    expect(assessInputQuality("Hola buenas, ¿cómo estás?")).toEqual({ kind: "ok" });
    expect(assessInputQuality("Me siento perdido y no sé qué hacer")).toEqual({ kind: "ok" });
    expect(assessInputQuality("I feel stuck")).toEqual({ kind: "ok" });
  });

  test("frases cortas pero significativas pasan", () => {
    expect(assessInputQuality("ya estoy")).toEqual({ kind: "ok" });
    expect(assessInputQuality("ayuda")).toEqual({ kind: "ok" });
  });

  test("mensajes con números mezclados pero con palabras reales pasan", () => {
    expect(assessInputQuality("Llevo 3 días sin dormir")).toEqual({ kind: "ok" });
  });
});

describe("buildAmbiguousInputResponse — rotación entre variantes", () => {
  test("Devuelve variante distinta para turnos consecutivos (no repite)", () => {
    const v0 = buildAmbiguousInputResponse("es", 0);
    const v1 = buildAmbiguousInputResponse("es", 1);
    const v2 = buildAmbiguousInputResponse("es", 2);
    expect(v0).not.toBe(v1);
    expect(v1).not.toBe(v2);
    expect(v0).not.toBe(v2);
  });

  test("Funciona en cada locale soportado", () => {
    for (const loc of ["es", "en", "pt", "fr"] as const) {
      const r = buildAmbiguousInputResponse(loc, 0);
      expect(r.length).toBeGreaterThan(20);
    }
  });

  test("Locale desconocido cae a español sin crashear", () => {
    const r = buildAmbiguousInputResponse("zh" as string, 0);
    expect(r).toContain("trabajar");
  });

  test("turnIndex negativo no rompe", () => {
    expect(() => buildAmbiguousInputResponse("es", -3)).not.toThrow();
  });
});
