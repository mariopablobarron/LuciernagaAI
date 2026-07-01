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
    // El copy del fallback es contextual por estado (feat 82fd9d5) y evoluciona;
    // verificamos que el fallback SE ACTIVA y devuelve texto, no el wording exacto.
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
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
    // El copy del fallback es contextual por estado (feat 82fd9d5) y evoluciona;
    // verificamos que el fallback SE ACTIVA y devuelve texto, no el wording exacto.
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
  });
});

describe("OpenRouter request body", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("envía la cadena de fallback con route=fallback en lugar de un solo model", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    } as Response);
    global.fetch = fetchMock;

    await generateAIResponse("hola", "neutral");

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body as string);

    // Lleva la cadena, no un model único
    expect(body.models).toEqual([
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-haiku-4-5",
      "openai/gpt-4o-mini",
    ]);
    expect(body.route).toBe("fallback");
    // Y NO el campo legacy `model` (para evitar ambigüedad con OpenRouter)
    expect(body.model).toBeUndefined();
  });
});
