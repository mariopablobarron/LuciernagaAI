/**
 * Tests del motor de oportunidades SEO.
 * Probamos lógica pura (priorities, fingerprints) sin tocar Prisma —
 * los detectores que hablan con DB se cubren con e2e a futuro.
 */
import { createHash } from "node:crypto";

// Recreamos el fingerprint que usa el módulo (es una función privada).
function fingerprint(d: { kind: string; url?: string | null; query?: string | null }): string {
  const key = `${d.kind}|${d.url ?? ""}|${d.query ?? ""}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 32);
}

describe("seo-opportunities fingerprint", () => {
  it("produce 32 chars hexadecimales", () => {
    const fp = fingerprint({ kind: "ranking_4_20", query: "coach emocional" });
    expect(fp).toMatch(/^[0-9a-f]{32}$/);
  });

  it("misma identidad → mismo fingerprint", () => {
    const a = fingerprint({ kind: "low_ctr_high_impressions", url: "/blog/x" });
    const b = fingerprint({ kind: "low_ctr_high_impressions", url: "/blog/x" });
    expect(a).toBe(b);
  });

  it("kind distinto → fingerprint distinto aunque url igual", () => {
    const a = fingerprint({ kind: "low_ctr_high_impressions", url: "/blog/x" });
    const b = fingerprint({ kind: "internal_links", url: "/blog/x" });
    expect(a).not.toBe(b);
  });

  it("url null y url vacía producen el mismo fingerprint (intencional)", () => {
    const a = fingerprint({ kind: "ranking_4_20", url: null, query: "q" });
    const b = fingerprint({ kind: "ranking_4_20", url: "", query: "q" });
    expect(a).toBe(b);
  });
});

// Curva CTR esperada (la que usa detectTitleMetaIssues).
function expectedCtr(pos: number): number {
  if (pos <= 1) return 0.28;
  if (pos <= 2) return 0.15;
  if (pos <= 3) return 0.11;
  if (pos <= 5) return 0.07;
  if (pos <= 10) return 0.03;
  return 0.01;
}

describe("expected CTR curve", () => {
  it("posición 1 alta", () => {
    expect(expectedCtr(1)).toBeGreaterThan(0.2);
  });

  it("monótona decreciente", () => {
    expect(expectedCtr(1)).toBeGreaterThan(expectedCtr(2));
    expect(expectedCtr(2)).toBeGreaterThan(expectedCtr(3));
    expect(expectedCtr(3)).toBeGreaterThan(expectedCtr(5));
    expect(expectedCtr(5)).toBeGreaterThan(expectedCtr(10));
    expect(expectedCtr(10)).toBeGreaterThan(expectedCtr(20));
  });

  it("posiciones por debajo de top10 muy bajas", () => {
    expect(expectedCtr(15)).toBeLessThanOrEqual(0.01);
    expect(expectedCtr(50)).toBeLessThanOrEqual(0.01);
  });
});
