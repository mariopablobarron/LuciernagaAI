import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { detectEmotionNlp, fuseEmotion } from "./emotion-nlp";

const ORIGINAL_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.HUGGINGFACE_API_TOKEN = "test-token";
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.HUGGINGFACE_API_TOKEN;
  } else {
    process.env.HUGGINGFACE_API_TOKEN = ORIGINAL_TOKEN;
  }
});

describe("detectEmotionNlp", () => {
  it("devuelve null si el texto está vacío", async () => {
    const result = await detectEmotionNlp("   ");
    expect(result).toBeNull();
  });

  it("devuelve null si no hay token configurado", async () => {
    delete process.env.HUGGINGFACE_API_TOKEN;
    const result = await detectEmotionNlp("estoy fatal");
    expect(result).toBeNull();
  });

  it("parsea respuesta plana [{label,score}, ...] y mapea a interna", async () => {
    mockFetchOnce(async () =>
      new Response(
        JSON.stringify([
          { label: "sadness", score: 0.82 },
          { label: "fear", score: 0.1 },
          { label: "joy", score: 0.05 },
        ]),
        { status: 200 }
      )
    );

    const result = await detectEmotionNlp("siento un peso enorme en el pecho");
    expect(result).not.toBeNull();
    expect(result?.rawLabel).toBe("sadness");
    expect(result?.mappedEmotion).toBe("apatía");
  });

  it("parsea respuesta anidada [[{label,score}, ...]]", async () => {
    mockFetchOnce(async () =>
      new Response(
        JSON.stringify([[
          { label: "fear", score: 0.7 },
          { label: "sadness", score: 0.2 },
        ]]),
        { status: 200 }
      )
    );

    const result = await detectEmotionNlp("no puedo dejar de pensar que va a pasar algo malo");
    expect(result?.rawLabel).toBe("fear");
    expect(result?.mappedEmotion).toBe("ansiedad");
  });

  it("mapea anger → frustración", async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify([{ label: "anger", score: 0.91 }]), { status: 200 })
    );
    const result = await detectEmotionNlp("estoy harto, otra vez lo mismo");
    expect(result?.mappedEmotion).toBe("frustración");
  });

  it("devuelve mappedEmotion=null para etiquetas sin mapeo (surprise/others)", async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify([{ label: "surprise", score: 0.6 }]), { status: 200 })
    );
    const result = await detectEmotionNlp("no me esperaba esto");
    expect(result?.rawLabel).toBe("surprise");
    expect(result?.mappedEmotion).toBeNull();
  });

  it("devuelve null si HF responde con error HTTP", async () => {
    mockFetchOnce(async () => new Response("rate limited", { status: 429 }));
    const result = await detectEmotionNlp("texto cualquiera");
    expect(result).toBeNull();
  });

  it("devuelve null si el payload no tiene la forma esperada", async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ error: "model loading" }), { status: 200 })
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
