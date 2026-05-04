import {
  BACKGROUND_FAST_MODEL,
  MAIN_CHAT_FALLBACK_CHAIN,
  MAIN_CHAT_MODEL,
} from "./openrouter-models";

describe("openrouter models catalog", () => {
  it("MAIN_CHAT_MODEL es de proveedor identificable", () => {
    expect(MAIN_CHAT_MODEL).toMatch(/^[a-z0-9-]+\/[a-z0-9.\-]+$/);
  });

  it("BACKGROUND_FAST_MODEL distinto del principal (cuenta como tier separado)", () => {
    expect(BACKGROUND_FAST_MODEL).not.toBe(MAIN_CHAT_MODEL);
  });

  it("la cadena de fallback empieza por el modelo principal", () => {
    expect(MAIN_CHAT_FALLBACK_CHAIN[0]).toBe(MAIN_CHAT_MODEL);
  });

  it("la cadena tiene al menos 2 entradas (defensa real)", () => {
    expect(MAIN_CHAT_FALLBACK_CHAIN.length).toBeGreaterThanOrEqual(2);
  });

  it("la cadena incluye un proveedor distinto de Anthropic (cubre caída del proveedor)", () => {
    const providers = new Set(MAIN_CHAT_FALLBACK_CHAIN.map((m) => m.split("/")[0]));
    expect(providers.size).toBeGreaterThan(1);
  });

  it("ningún elemento duplicado en la cadena", () => {
    const set = new Set(MAIN_CHAT_FALLBACK_CHAIN);
    expect(set.size).toBe(MAIN_CHAT_FALLBACK_CHAIN.length);
  });
});
