import {
  detectGriefIntent,
  detectMildIdeation,
  detectGratitudeClosure,
  detectExtendedIntents,
  hasAnyExtendedIntent,
} from "@/services/extendedIntents";

describe("detectGriefIntent", () => {
  it.each([
    ["Mi madre falleció la semana pasada", true],
    ["mi padre murio hace dos meses", true],
    ["se nos fue el abuelo", true],
    ["Estoy de luto", true],
    ["mi pareja me ha dejado", true],
    ["me dejaste sin avisar", true],
    ["me echaron del trabajo", true],
    ["perdí mi trabajo", true],
    ["la echo de menos cada día", true],
    ["perdimos el embarazo en la semana 12", true],
    ["aborté hace tres semanas", true],
    // Variantes con tildes
    ["mi padre falleció", true],
    ["MI MADRE MURIO HACE UN AÑO", true],
  ])("detecta duelo en %p", (msg, expected) => {
    expect(detectGriefIntent(msg)).toBe(expected);
  });

  it.each([
    ["Estoy bloqueado con el trabajo", false],
    ["Necesito ayuda para decidir", false],
    ["Quiero cambiar de carrera", false],
    ["Me siento ansiosa por el examen", false],
  ])("no marca falsos positivos en %p", (msg, expected) => {
    expect(detectGriefIntent(msg)).toBe(expected);
  });
});

describe("detectMildIdeation", () => {
  it.each([
    ["ojalá no estuviera aquí", true],
    ["no quiero seguir así", true],
    ["no aguanto más con esto", true],
    ["estoy roto por dentro", true],
    ["me siento vacía", true],
    ["quisiera desaparecer", true],
    ["odio mi vida", true],
    ["estoy en el pozo", true],
    ["toqué fondo", true],
    ["qué sentido tiene", true],
  ])("detecta ideación leve en %p", (msg, expected) => {
    expect(detectMildIdeation(msg)).toBe(expected);
  });

  it.each([
    ["Estoy cansada pero bien", false],
    ["Necesito descansar", false],
    ["Tengo mucho trabajo", false],
    ["Me siento confundida sobre la decisión", false],
  ])("no marca falsos positivos en %p", (msg, expected) => {
    expect(detectMildIdeation(msg)).toBe(expected);
  });
});

describe("detectGratitudeClosure", () => {
  it.each([
    ["Muchas gracias por todo", true],
    ["te lo agradezco", true],
    ["me has ayudado mucho", true],
    ["me siento mejor ahora", true],
    ["me siento más tranquila", true],
    ["por hoy ya está", true],
    ["es lo que necesitaba", true],
    ["lo dejamos aquí", true],
    ["me has dado claridad", true],
  ])("detecta gratitud/cierre en %p", (msg, expected) => {
    expect(detectGratitudeClosure(msg)).toBe(expected);
  });

  it.each([
    ["Necesito que me ayudes", false],
    ["Quiero seguir hablando", false],
    ["Cuéntame más sobre eso", false],
  ])("no marca falsos positivos en %p", (msg, expected) => {
    expect(detectGratitudeClosure(msg)).toBe(expected);
  });
});

describe("detectExtendedIntents bundle", () => {
  it("devuelve los 3 flags en false cuando el mensaje es neutral", () => {
    const result = detectExtendedIntents("Hoy quiero avanzar con mi proyecto");
    expect(result).toEqual({ grief: false, mildIdeation: false, gratitudeClosure: false });
  });

  it("activa solo grief cuando hay pérdida", () => {
    const result = detectExtendedIntents("Mi padre murió el mes pasado y no levanto cabeza");
    expect(result.grief).toBe(true);
    expect(result.mildIdeation).toBe(false);
    expect(result.gratitudeClosure).toBe(false);
  });

  it("puede activar varios a la vez si el mensaje los combina", () => {
    const result = detectExtendedIntents("Gracias, me has ayudado, aunque a veces ojalá no estuviera aquí");
    expect(result.gratitudeClosure).toBe(true);
    expect(result.mildIdeation).toBe(true);
  });
});

describe("hasAnyExtendedIntent", () => {
  it("false cuando todos los flags son false", () => {
    expect(hasAnyExtendedIntent({ grief: false, mildIdeation: false, gratitudeClosure: false })).toBe(false);
  });

  it("true si al menos uno está activo", () => {
    expect(hasAnyExtendedIntent({ grief: true, mildIdeation: false, gratitudeClosure: false })).toBe(true);
    expect(hasAnyExtendedIntent({ grief: false, mildIdeation: true, gratitudeClosure: false })).toBe(true);
    expect(hasAnyExtendedIntent({ grief: false, mildIdeation: false, gratitudeClosure: true })).toBe(true);
  });
});
