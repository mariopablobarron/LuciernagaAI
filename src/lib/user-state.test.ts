import { detectUserState } from "@/services/state";

describe("detectUserState", () => {
  it("detecta estado perdido", () => {
    expect(detectUserState("No sé por dónde empezar")).toBe("perdido");
  });

  it("detecta estado ansioso", () => {
    expect(detectUserState("Tengo pánico y mucho miedo")).toBe("ansioso");
  });

  it("detecta estado bloqueado", () => {
    expect(detectUserState("Estoy bloqueado y estancado")).toBe("bloqueado");
  });

  it("retorna neutral cuando no hay señales claras", () => {
    expect(detectUserState("Quiero planear mi semana")).toBe("neutral");
  });
});
