import {
  buildSearchQuery,
  needsExternalInfo,
  searchWeb,
} from "@/services/search";

describe("search service", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("detecta cuándo hace falta info externa", () => {
    expect(needsExternalInfo("Busca noticias de OpenAI hoy")).toBe(true);
    expect(needsExternalInfo("Me siento bloqueado y no sé qué hacer")).toBe(false);
  });

  it("limpia la query antes de buscar", () => {
    expect(buildSearchQuery("Por favor, puedes buscar noticias de OpenAI")).toBe(
      "buscar noticias de OpenAI"
    );
  });

  it("combina resultados de búsqueda web", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Heading: "OpenAI",
          AbstractText: "OpenAI overview",
          AbstractURL: "https://example.com/openai",
          RelatedTopics: [],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            search: [
              {
                title: "OpenAI research",
                snippet: "Research updates",
              },
            ],
          },
        }),
      } as Response);

    const results = await searchWeb("OpenAI", 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain("OpenAI");
  });
});
