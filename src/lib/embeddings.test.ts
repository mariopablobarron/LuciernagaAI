import {
  cosineSimilarity,
  isEmbeddingsEnabled,
  prepareForEmbed,
  shouldEmbed,
} from "./embeddings";

describe("embeddings utils", () => {
  describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
    });

    it("returns 0 for orthogonal vectors", () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });

    it("returns -1 for opposite vectors", () => {
      expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
    });

    it("returns 0 for empty vectors", () => {
      expect(cosineSimilarity([], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
    });

    it("returns 0 for mismatched dimensions", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it("returns 0 for zero-norm vector", () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });

    it("ranks similar vectors closer than dissimilar", () => {
      const query = [1, 1, 0];
      const close = cosineSimilarity(query, [1, 1, 0.1]);
      const far = cosineSimilarity(query, [-1, -1, 0]);
      expect(close).toBeGreaterThan(far);
    });
  });

  describe("shouldEmbed", () => {
    it("rejects short text", () => {
      expect(shouldEmbed("hola")).toBe(false);
      expect(shouldEmbed("    ")).toBe(false);
    });

    it("accepts text >= 20 chars", () => {
      expect(shouldEmbed("hola, qué tal estás hoy")).toBe(true);
    });
  });

  describe("prepareForEmbed", () => {
    it("trims whitespace", () => {
      expect(prepareForEmbed("   hola   ")).toBe("hola");
    });

    it("truncates to 8000 chars", () => {
      const long = "a".repeat(10000);
      expect(prepareForEmbed(long).length).toBe(8000);
    });
  });

  describe("isEmbeddingsEnabled", () => {
    const original = process.env.OPENAI_API_KEY;
    afterEach(() => {
      if (original === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = original;
    });

    it("false when key missing", () => {
      delete process.env.OPENAI_API_KEY;
      expect(isEmbeddingsEnabled()).toBe(false);
    });

    it("false when key empty", () => {
      process.env.OPENAI_API_KEY = "   ";
      expect(isEmbeddingsEnabled()).toBe(false);
    });

    it("true when key present", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      expect(isEmbeddingsEnabled()).toBe(true);
    });
  });
});
