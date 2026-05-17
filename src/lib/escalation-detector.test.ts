import { detectEscalation } from "./escalation-detector";

describe("detectEscalation — false positives (no dispara para malestar general)", () => {
  test("Venteo de estrés", () => {
    expect(detectEscalation("estoy muy estresado con el trabajo", "es").category).toBeNull();
  });
  test("Tristeza sin síntomas profesionales", () => {
    expect(detectEscalation("hoy me he sentido triste todo el día", "es").category).toBeNull();
  });
  test("Ansiedad común", () => {
    expect(detectEscalation("tengo ansiedad por el examen de mañana", "es").category).toBeNull();
  });
  test("Texto demasiado corto", () => {
    expect(detectEscalation("uf", "es").category).toBeNull();
  });
});

describe("detectEscalation — trauma", () => {
  test("Abuso explícito (ES)", () => {
    const r = detectEscalation("cuando era pequeño me pegaba mi padre y nunca lo conté", "es");
    expect(r.category).toBe("trauma");
    expect(r.confidence).toBeGreaterThanOrEqual(0.5);
  });
  test("Violación (EN)", () => {
    expect(detectEscalation("i was raped two years ago and i can't sleep", "en").category).toBe("trauma");
  });
  test("Trauma severo mencionado por nombre (FR)", () => {
    expect(detectEscalation("je porte un traumatisme d'enfance très lourd", "fr").category).toBe("trauma");
  });
});

describe("detectEscalation — eating disorder", () => {
  test("Anorexia explícita (ES)", () => {
    expect(detectEscalation("creo que tengo anorexia pero no me atrevo a decirlo en casa", "es").category).toBe("eating_disorder");
  });
  test("Atracones y purga (EN)", () => {
    expect(detectEscalation("i binge eat at night and then i vomit after eating", "en").category).toBe("eating_disorder");
  });
});

describe("detectEscalation — síntomas psicóticos", () => {
  test("Oigo voces (ES)", () => {
    expect(detectEscalation("a veces oigo voces que me dicen cosas malas", "es").category).toBe("psychotic_symptoms");
  });
  test("Paranoia (EN)", () => {
    expect(detectEscalation("i feel like i'm being watched all the time", "en").category).toBe("psychotic_symptoms");
  });
});

describe("detectEscalation — adicción activa", () => {
  test("Alcoholismo (ES)", () => {
    expect(detectEscalation("bebo todos los días y no puedo parar", "es").category).toBe("active_addiction");
  });
});

describe("detectEscalation — petición explícita", () => {
  test("Necesito terapeuta (ES)", () => {
    expect(detectEscalation("creo que necesito un psicólogo de verdad", "es").category).toBe("explicit_request");
  });
  test("Esto me supera (EN)", () => {
    expect(detectEscalation("you're not enough for this", "en").category).toBe("explicit_request");
  });
});

describe("detectEscalation — multi-locale fallback", () => {
  test("Locale desconocido cae a ES sin crashear", () => {
    const r = detectEscalation("oigo voces que me persiguen", "xx" as unknown as string);
    expect(r.category).toBe("psychotic_symptoms");
  });
});
