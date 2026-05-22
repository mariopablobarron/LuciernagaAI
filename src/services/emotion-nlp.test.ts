import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { detectEmotionNlp, fuseEmotion } from "./emotion-nlp";

const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;
const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
}

/** Construye una respuesta con la forma de OpenRouter chat completions. */
function openRouterResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status },
  );
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
  }
});

describe("detectEmotionNlp", () => {
  it("devuelve null si el texto está vacío", async () => {
    const result = await detectEmotionNlp("   ");
    expect(result).toBeNull();
  });

  it("devuelve null si no hay OPENROUTER_API_KEY configurada", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const result = await detectEmotionNlp("estoy fatal");
    expect(result).toBeNull();
  });

  it("parsea JSON limpio del LLM y mapea sadness → apatía", async () => {
    mockFetchOnce(async () =>
      openRouterResponse('{"label":"sadness","score":0.82}')
    );
    const result = await detectEmotionNlp("siento un peso enorme en el pecho");
    expect(result).not.toBeNull();
    expect(result?.rawLabel).toBe("sadness");
    expect(result?.rawScore).toBe(0.82);
    expect(result?.mappedEmotion).toBe("apatía");
  });

  it("tolera JSON envuelto en markdown ```json … ```", async () => {
    mockFetchOnce(async () =>
      openRouterResponse('```json\n{"label":"fear","score":0.7}\n```')
    );
    const result = await detectEmotionNlp("no puedo dejar de pensar que va a pasar algo malo");
    expect(result?.rawLabel).toBe("fear");
    expect(result?.mappedEmotion).toBe("ansiedad");
  });

  it("mapea anger → frustración", async () => {
    mockFetchOnce(async () =>
      openRouterResponse('{"label":"anger","score":0.91}')
    );
    const result = await detectEmotionNlp("estoy harto, otra vez lo mismo");
    expect(result?.mappedEmotion).toBe("frustración");
  });

  it("devuelve mappedEmotion=null para etiquetas sin mapeo (surprise/others)", async () => {
    mockFetchOnce(async () =>
      openRouterResponse('{"label":"surprise","score":0.6}')
    );
    const result = await detectEmotionNlp("no me esperaba esto");
    expect(result?.rawLabel).toBe("surprise");
    expect(result?.mappedEmotion).toBeNull();
  });

  it("score ausente → confianza media 0.5", async () => {
    mockFetchOnce(async () =>
      openRouterResponse('{"label":"joy"}')
    );
    const result = await detectEmotionNlp("hoy me siento bien");
    expect(result?.rawLabel).toBe("joy");
    expect(result?.rawScore).toBe(0.5);
  });

  it("devuelve null si OpenRouter responde con error HTTP", async () => {
    mockFetchOnce(async () => openRouterResponse("rate limited", 429));
    const result = await detectEmotionNlp("texto cualquiera");
    expect(result).toBeNull();
  });

  it("devuelve null si el LLM devuelve una etiqueta inválida", async () => {
    mockFetchOnce(async () =>
      openRouterResponse('{"label":"euforia","score":0.9}')
    );
    const result = await detectEmotionNlp("texto cualquiera");
    expect(result).toBeNull();
  });

  it("devuelve null si el contenido no tiene JSON parseable", async () => {
    mockFetchOnce(async () =>
      openRouterResponse("No puedo clasificar este mensaje.")
    );
    const result = await detectEmotionNlp("texto cualquiera");
    expect(result).toBeNull();
  });

  it("devuelve null cuando el fetch lanza (red, timeout, etc.)", async () => {
    mockFetchOnce(async () => {
      throw new Error("network down");
    });
    const result = await detectEmotionNlp("texto cualquiera");
    expect(result).toBeNull();
  });

  it("aborta y devuelve null si pasa el timeout", async () => {
    mockFetchOnce(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        })
    );
    const result = await detectEmotionNlp("texto", { timeoutMs: 20 });
    expect(result).toBeNull();
  });
});

describe("fuseEmotion", () => {
  it("devuelve la keyword-emotion si NLP es null", () => {
    expect(fuseEmotion("ansiedad", null)).toBe("ansiedad");
  });

  it("devuelve la keyword-emotion si NLP no mapea (surprise)", () => {
    expect(
      fuseEmotion("calma", {
        rawLabel: "surprise",
        rawScore: 0.9,
        mappedEmotion: null,
        all: [],
      })
    ).toBe("calma");
  });

  it("devuelve la keyword-emotion si la confianza NLP es baja (<0.55)", () => {
    expect(
      fuseEmotion("calma", {
        rawLabel: "sadness",
        rawScore: 0.4,
        mappedEmotion: "apatía",
        all: [],
      })
    ).toBe("calma");
  });

  it("usa NLP cuando keyword='calma' (default) y NLP detecta negativa con score>=0.55", () => {
    expect(
      fuseEmotion("calma", {
        rawLabel: "sadness",
        rawScore: 0.78,
        mappedEmotion: "apatía",
        all: [],
      })
    ).toBe("apatía");
  });

  it("respeta keyword-emotion si ya es no-calma (no pisa señal explícita)", () => {
    expect(
      fuseEmotion("frustración", {
        rawLabel: "sadness",
        rawScore: 0.9,
        mappedEmotion: "apatía",
        all: [],
      })
    ).toBe("frustración");
  });

  it("no pisa keyword='calma' si NLP también dice calma (joy)", () => {
    expect(
      fuseEmotion("calma", {
        rawLabel: "joy",
        rawScore: 0.9,
        mappedEmotion: "calma",
        all: [],
      })
    ).toBe("calma");
  });
});
