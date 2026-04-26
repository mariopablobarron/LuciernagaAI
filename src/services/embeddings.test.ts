import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  embed,
  embedMany,
  toPgVectorLiteral,
  EMBEDDING_DIM,
  MissingOpenAIKeyError,
  EmbeddingsProviderError,
} from "./embeddings";

const ORIGINAL_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_FETCH = global.fetch;

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
}

function fakeVec(seed: number): number[] {
  return Array.from({ length: EMBEDDING_DIM }, (_, i) => (seed + i) / 10000);
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "sk-test";
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIGINAL_KEY;
});

describe("embed", () => {
  it("lanza MissingOpenAIKeyError si no hay API key", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(embed("hola")).rejects.toBeInstanceOf(MissingOpenAIKeyError);
  });

  it("lanza si el texto está vacío", async () => {
    await expect(embed("   ")).rejects.toThrow(/empty/);
  });

  it("devuelve un vector de 1536 dim para texto válido", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          data: [{ embedding: fakeVec(1), index: 0 }],
        }),
        { status: 200 },
      ),
    );

    const vec = await embed("estoy bloqueado con el trabajo");
    expect(vec).toHaveLength(EMBEDDING_DIM);
  });

  it("propaga error si el provider responde no-2xx", async () => {
    mockFetch(async () => new Response("rate limited", { status: 429 }));
    await expect(embed("hola")).rejects.toBeInstanceOf(EmbeddingsProviderError);
  });

  it("falla si la dimensión del vector recibido no es 1536", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }] }),
        { status: 200 },
      ),
    );
    await expect(embed("hola")).rejects.toThrow(/dim mismatch/);
  });
});

describe("embedMany", () => {
  it("devuelve [] para input vacío y NO llama al provider", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const out = await embedMany([]);
    expect(out).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("filtra strings vacíos antes de embebir", async () => {
    let receivedInput: string[] = [];
    mockFetch(async (_url, init) => {
      const body = JSON.parse(init!.body as string) as { input: string[] };
      receivedInput = body.input;
      return new Response(
        JSON.stringify({
          data: receivedInput.map((_, i) => ({ embedding: fakeVec(i), index: i })),
        }),
        { status: 200 },
      );
    });

    await embedMany(["hola", "  ", "", "mundo"]);
    expect(receivedInput).toEqual(["hola", "mundo"]);
  });

  it("respeta el orden de salida según `index` de la respuesta", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          // OpenAI puede devolver fuera de orden — verificamos que ordenamos.
          data: [
            { embedding: fakeVec(20), index: 1 },
            { embedding: fakeVec(10), index: 0 },
          ],
        }),
        { status: 200 },
      ),
    );

    const [v0, v1] = await embedMany(["primero", "segundo"]);
    expect(v0[0]).toBeCloseTo(10 / 10000, 6);
    expect(v1[0]).toBeCloseTo(20 / 10000, 6);
  });
});

describe("toPgVectorLiteral", () => {
  it("formatea como literal pgvector con corchetes y coma", () => {
    const lit = toPgVectorLiteral([0.1, -0.2, 0.3]);
    expect(lit).toBe("[0.1000000,-0.2000000,0.3000000]");
  });
});
