import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { reformulateMessage } from "./reformulate";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
});

describe("reformulateMessage — heurística (no debería llamar al LLM)", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    global.fetch = jest.fn() as unknown as typeof global.fetch;
  });

  it("no llama al LLM si no hay historial suficiente", async () => {
    const result = await reformulateMessage({
      message: "y eso por qué",
      history: [],
      userId: "u1",
    });
    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("no_history");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("no llama al LLM si historial < 2 turnos", async () => {
    const result = await reformulateMessage({
      message: "y eso por qué",
      history: [{ role: "user", content: "hola" }],
      userId: "u1",
    });
    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("no_history");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("no llama al LLM si el mensaje es largo (>120 chars)", async () => {
    const longMsg =
      "Llevo todo el día pensando en lo que me dijiste sobre el trabajo y creo que tengo que tomar una decisión esta semana sin posponerlo más, dime cómo procedo";
    const result = await reformulateMessage({
      message: longMsg,
      history: [
        { role: "user", content: "hola" },
        { role: "assistant", content: "qué tal" },
      ],
      userId: "u1",
    });
    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("looks_explicit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("no llama al LLM si el mensaje no contiene tokens ambiguos", async () => {
    const result = await reformulateMessage({
      message: "necesito un consejo concreto",
      history: [
        { role: "user", content: "hola" },
        { role: "assistant", content: "qué tal" },
      ],
      userId: "u1",
    });
    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("looks_explicit");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("reformulateMessage — llamada al LLM", () => {
  const baseHistory = [
    { role: "user" as const, content: "estoy bloqueado con el proyecto de la web" },
    { role: "assistant" as const, content: "entiendo. ¿Qué parte concreta te frena más?" },
  ];

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  it("dispara llamada al LLM y devuelve la versión reformulada cuando matchea token ambiguo", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content:
                  "¿Por qué estoy bloqueado con el proyecto de la web según lo que me has dicho antes?",
              },
            },
          ],
        }),
    } as never) as unknown as typeof global.fetch;
    global.fetch = mockFetch;

    const result = await reformulateMessage({
      message: "y eso por qué",
      history: baseHistory,
      userId: "u1",
    });

    expect(result.reformulated).toBe(true);
    expect(result.reason).toBe("rewritten");
    expect(result.standalone).toContain("bloqueado");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("devuelve unchanged cuando la reformulación es básicamente igual al original", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "y eso por qué" } }],
        }),
    } as never) as unknown as typeof global.fetch;
    global.fetch = mockFetch;

    const result = await reformulateMessage({
      message: "y eso por qué",
      history: baseHistory,
      userId: "u1",
    });

    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("unchanged");
    expect(result.standalone).toBeNull();
  });

  it("falla silenciosamente si el LLM responde error", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 } as never) as unknown as typeof global.fetch;
    global.fetch = mockFetch;

    const result = await reformulateMessage({
      message: "lo de antes",
      history: baseHistory,
      userId: "u1",
    });

    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("llm_failed");
  });

  it("falla silenciosamente si fetch lanza excepción", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down") as never) as unknown as typeof global.fetch;

    const result = await reformulateMessage({
      message: "y por qué",
      history: baseHistory,
      userId: "u1",
    });

    expect(result.reformulated).toBe(false);
    expect(result.reason).toBe("llm_failed");
  });

  it("trunca el historial al pasar al LLM (últimos 6 turnos)", async () => {
    let bodySent: { messages?: Array<{ role: string; content: string }> } | null = null;
    const mockFetch = jest.fn().mockImplementation((_url, init) => {
      bodySent = JSON.parse((init as RequestInit).body as string);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              { message: { content: "Reformulación que es claramente más larga que el original ambiguo" } },
            ],
          }),
      } as never);
    }) as unknown as typeof global.fetch;
    global.fetch = mockFetch;

    // 10 turnos de historial — solo los últimos 6 deben llegar al LLM
    const longHistory = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `turno ${i}`,
    }));

    await reformulateMessage({
      message: "y eso",
      history: longHistory,
      userId: "u1",
    });

    expect(bodySent).not.toBeNull();
    // 1 system + 6 historial + 1 marker = 8 messages
    expect(bodySent!.messages).toHaveLength(8);
  });
});
