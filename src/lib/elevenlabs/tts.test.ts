/**
 * Tests del TTS wrapper. Cubre:
 *  - happy path (texto válido → audio)
 *  - cache hit (mismo texto se sirve sin gastar quota)
 *  - texto vacío / demasiado largo → throws
 *  - propagación de errores de ElevenLabs (quota_exceeded, rate_limited)
 *
 * Estrategia: mock global.fetch para no llamar a la API real.
 */

import { synthesize, getCacheStats } from "./tts";
import { ElevenLabsError } from "./client";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_API_KEY = process.env.ELEVENLABS_API_KEY;

function mockFetch(response: { ok: boolean; status?: number; body?: ArrayBuffer | string; contentType?: string }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    headers: new Headers({ "content-type": response.contentType ?? "audio/mpeg" }),
    arrayBuffer: async () =>
      response.body instanceof ArrayBuffer
        ? response.body
        : new TextEncoder().encode(response.body ?? "").buffer,
    text: async () => (typeof response.body === "string" ? response.body : ""),
    json: async () => ({}),
  } as unknown as Response);
}

beforeAll(() => {
  process.env.ELEVENLABS_API_KEY = "sk_test_dummy";
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env.ELEVENLABS_API_KEY = ORIGINAL_API_KEY;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("synthesize — input validation", () => {
  test("texto vacío lanza", async () => {
    await expect(synthesize("")).rejects.toThrow("Texto vacío");
    await expect(synthesize("   ")).rejects.toThrow("Texto vacío");
  });

  test("texto > 1500 chars lanza", async () => {
    const huge = "a".repeat(1501);
    await expect(synthesize(huge)).rejects.toThrow(/excede 1500/);
  });
});

describe("synthesize — happy path", () => {
  test("devuelve audio + metadata; segunda llamada con mismo texto golpea cache", async () => {
    const audioBytes = new Uint8Array([0xff, 0xfb, 0x90, 0x44]); // header MP3 falso
    mockFetch({ ok: true, body: audioBytes.buffer });

    const first = await synthesize("Hola, ¿cómo estás?");
    expect(first.cached).toBe(false);
    expect(first.audio.byteLength).toBe(4);
    expect(first.contentType).toBe("audio/mpeg");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Segunda llamada con MISMO texto → cache hit, sin nueva llamada HTTP.
    const second = await synthesize("Hola, ¿cómo estás?");
    expect(second.cached).toBe(true);
    expect(second.audio.byteLength).toBe(4);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("voiceId distinto NO golpea el cache del default", async () => {
    const audioBytes = new Uint8Array([0xff]);
    mockFetch({ ok: true, body: audioBytes.buffer });

    // Primera con voz default.
    await synthesize("Frase única para test");
    // Misma frase pero otra voz → nueva llamada.
    await synthesize("Frase única para test", { voiceId: "custom-voice-id" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("synthesize — propagación de errores ElevenLabs", () => {
  test("quota_exceeded se propaga como ElevenLabsError", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => JSON.stringify({ detail: { status: "quota_exceeded" } }),
    } as unknown as Response);

    await expect(synthesize("Texto cualquiera nuevo")).rejects.toMatchObject({
      kind: "quota_exceeded",
    });
  });

  test("rate limit se propaga como rate_limited", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: async () => "Too many requests",
    } as unknown as Response);

    await expect(synthesize("Otra frase distinta nueva")).rejects.toMatchObject({
      kind: "rate_limited",
    });
  });

  test("fallo de red se propaga como network", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(synthesize("Texto fresco para network")).rejects.toMatchObject({
      kind: "network",
    });
  });
});

describe("getCacheStats", () => {
  test("devuelve forma esperada", () => {
    const stats = getCacheStats();
    expect(stats).toHaveProperty("entries");
    expect(stats).toHaveProperty("bytes");
    expect(stats).toHaveProperty("maxBytes");
    expect(stats.maxBytes).toBeGreaterThan(0);
  });
});

describe("synthesize — sin API key configurada", () => {
  test("lanza missing_key si ELEVENLABS_API_KEY está vacía", async () => {
    process.env.ELEVENLABS_API_KEY = "";
    await expect(synthesize("Cualquier texto missing key")).rejects.toMatchObject({
      kind: "missing_key",
    });
    process.env.ELEVENLABS_API_KEY = "sk_test_dummy"; // restore
  });
});

// El error es ElevenLabsError — verificación de tipo.
test("ElevenLabsError es instance de Error", () => {
  const err = new ElevenLabsError("quota_exceeded", "test");
  expect(err).toBeInstanceOf(Error);
  expect(err.kind).toBe("quota_exceeded");
});
