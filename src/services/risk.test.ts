import { classifyRisk, detectRiskLevel, getCrisisResponse } from "@/services/risk";

describe("risk service", () => {
  it("clasifica como critical cuando hay ideación suicida explícita", () => {
    expect(classifyRisk("Me quiero matar y no quiero vivir")).toBe("critical");
  });

  it("clasifica como high en desesperanza extrema", () => {
    expect(classifyRisk("No puedo más, nada tiene sentido")).toBe("high");
  });

  it("detecta riesgo acumulado con contexto", () => {
    expect(detectRiskLevel("No sé qué hacer", ["No puedo más"])).toBe("high");
  });

  it("devuelve respuesta de crisis con recursos en nivel crítico", () => {
    const response = getCrisisResponse("critical");
    expect(response.shouldEscalate).toBe(true);
    expect(response.resources.length).toBeGreaterThan(0);
    expect(response.response).toContain("seguridad");
    expect(response.resources.join(" ")).toContain("024");
    expect(response.resources.join(" ")).toContain("988");
  });
});
