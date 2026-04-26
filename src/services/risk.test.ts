import { classifyRisk, detectRiskLevel, getCrisisResponse } from "@/services/risk";

describe("risk service — classifier", () => {
  describe("CRITICAL — intencionalidad explícita o plan", () => {
    it.each([
      "Me quiero matar y no quiero vivir",
      "Quiero morir, no aguanto más",
      "Voy a acabar con todo esta noche",
      "Esta noche acabo con todo",
      "Hoy termino todo, me voy a quitar la vida",
      "Tengo las pastillas listas",
      "Ya tengo decidido cuándo lo voy a hacer",
      "Me voy a quitar de en medio",
      "Acabar con mi vida es la única salida",
      "i want to die",
      "thinking about suicide tonight",
      "i'm going to end it",
    ])("'%s' → critical", (msg) => {
      expect(classifyRisk(msg)).toBe("critical");
    });
  });

  describe("HIGH — desesperanza profunda / ideación pasiva", () => {
    it.each([
      "No puedo más, nada tiene sentido",
      "No le encuentro sentido a nada",
      "Para qué seguir viviendo",
      "No merece la pena seguir",
      "Ojalá no despertara mañana",
      "No me importaría no despertar",
      "A veces pienso en desaparecer",
      "Sería mejor si yo no estuviera",
      "Soy una carga para todos",
      "El mundo estaría mejor sin mi",
      "Me odio profundamente",
      "Estoy roto por dentro",
      "Estoy harto de la vida",
      "Quiero que esto termine ya",
      "i can't go on like this",
      "i hate myself",
    ])("'%s' → high", (msg) => {
      expect(classifyRisk(msg)).toBe("high");
    });
  });

  describe("MEDIUM — sufrimiento intenso sin ideación", () => {
    it.each([
      "Me siento hundida",
      "Estoy fatal",
      "Tengo un ataque de pánico",
      "Siento que me ahogo con todo",
      "Me asfixia esto",
      "Llevo días llorando",
      "No duermo desde hace semanas",
      "Tengo miedo de mí mismo",
      "No puedo vivir sin él",
      "Si me deja me muero",
    ])("'%s' → medium", (msg) => {
      expect(classifyRisk(msg)).toBe("medium");
    });
  });

  describe("LOW — sin riesgo detectable", () => {
    it.each([
      "Hola",
      "Tengo un mal día",
      "No sé qué hacer con mi trabajo",
      "Necesito ordenar mis ideas",
      "Estoy un poco cansado",
    ])("'%s' → low", (msg) => {
      expect(classifyRisk(msg)).toBe("low");
    });
  });

  describe("normalización (tildes y mayúsculas)", () => {
    it("ignora tildes — 'estoy al límite' = 'estoy al limite'", () => {
      expect(classifyRisk("ESTOY AL LÍMITE")).toBe("high");
    });
    it("ignora tildes en eufemismos", () => {
      expect(classifyRisk("Ojalá no despertara mañana")).toBe("high");
    });
  });

  describe("contexto acumulado", () => {
    it("toma el max del contexto reciente", () => {
      expect(detectRiskLevel("No sé qué hacer", ["No puedo más"])).toBe("high");
    });
    it("escala si la última frase es critical aunque el contexto sea low", () => {
      expect(detectRiskLevel("me quiero matar", ["hola", "que tal"])).toBe("critical");
    });
  });
});

describe("risk service — getCrisisResponse", () => {
  it("critical: shouldEscalate, recursos, no continúa chat", () => {
    const r = getCrisisResponse("critical");
    expect(r.shouldEscalate).toBe(true);
    expect(r.continueChat).toBe(false);
    expect(r.resources.length).toBeGreaterThan(0);
    expect(r.response).toContain("seguridad");
    expect(r.resources.join(" ")).toContain("024");
    expect(r.resources.join(" ")).toContain("988");
  });

  it("high: corta chat también", () => {
    const r = getCrisisResponse("high");
    expect(r.continueChat).toBe(false);
    expect(r.shouldEscalate).toBe(true);
  });

  it("medium: no corta chat, sin escalada", () => {
    const r = getCrisisResponse("medium");
    expect(r.continueChat).toBe(true);
    expect(r.shouldEscalate).toBe(false);
  });

  it("low: continúa normal", () => {
    const r = getCrisisResponse("low");
    expect(r.continueChat).toBe(true);
    expect(r.shouldEscalate).toBe(false);
  });
});
