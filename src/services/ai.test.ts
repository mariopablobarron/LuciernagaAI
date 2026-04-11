import { generateAIResponse } from "@/services/ai";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";

describe("generateAIResponse", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("activa fallback cuando falta OPENROUTER_API_KEY", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const result = await generateAIResponse("No sé por dónde empezar", "duda");

    expect(result.fallback).toBe(true);
    expect(result.response).toBe(
      "Vamos a hacerlo simple. Dime qué estás evitando ahora mismo y lo convertimos en un paso concreto hoy."
    );
  });

  it("retorna respuesta real cuando OpenRouter responde bien", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Respuesta mentor" } }],
      }),
    } as Response);

    const result = await generateAIResponse("Estoy bloqueado", "bloqueo", {
      ...DEFAULT_EMOTIONAL_PROFILE,
      primaryEmotion: "frustración",
      dominantPattern: "perfeccionismo",
      energyLevel: "alto",
    });

    expect(result.fallback).toBe(false);
    expect(result.response).toBe("Respuesta mentor");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining("emoción=frustración"),
      })
    );
  });

  it("activa fallback cuando OpenRouter falla", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "Bad gateway",
    } as Response);

    const result = await generateAIResponse("Tengo ansiedad", "ansiedad");

    expect(result.fallback).toBe(true);
    expect(result.response).toBe(
      "Vamos a hacerlo simple. Dime qué estás evitando ahora mismo y lo convertimos en un paso concreto hoy."
    );
  });
});
