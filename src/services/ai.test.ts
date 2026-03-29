import { generateAIResponse } from "@/services/ai";

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

    const result = await generateAIResponse("No sé por dónde empezar", "perdido");

    expect(result.fallback).toBe(true);
    expect(result.response).toBe("Estoy contigo. Vamos paso a paso.");
  });

  it("retorna respuesta real cuando OpenRouter responde bien", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Respuesta mentor" } }],
      }),
    } as Response);

    const result = await generateAIResponse("Estoy bloqueado", "bloqueado");

    expect(result.fallback).toBe(false);
    expect(result.response).toBe("Respuesta mentor");
  });

  it("activa fallback cuando OpenRouter falla", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "Bad gateway",
    } as Response);

    const result = await generateAIResponse("Tengo ansiedad", "ansioso");

    expect(result.fallback).toBe(true);
    expect(result.response).toBe("Estoy contigo. Vamos paso a paso.");
  });
});
