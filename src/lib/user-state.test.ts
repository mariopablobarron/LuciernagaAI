import { detectUserState } from "@/services/state";

describe("detectUserState", () => {
  it("detecta estado duda", () => {
    expect(detectUserState("No sé por dónde empezar")).toBe("duda");
  });

  it("detecta estado ansiedad", () => {
    expect(detectUserState("Tengo pánico y mucho miedo")).toBe("ansiedad");
  });

  it("detecta estado bloqueo", () => {
    expect(detectUserState("Estoy bloqueado y estancado")).toBe("bloqueo");
  });

  it("detecta estado claridad", () => {
    expect(detectUserState("Ya sé el plan y tengo claridad para avanzar")).toBe("claridad");
  });

  it("retorna neutral cuando no hay señales claras", () => {
    expect(detectUserState("Quiero planear mi semana")).toBe("neutral");
  });
});
