import {
  ENNEAGRAM_ITEMS,
  getOrderedItems,
  scoreEnneagram,
  type EnneagramType,
  type LikertAnswer,
} from "./enneagram-oeps";

describe("ENNEAGRAM_ITEMS", () => {
  it("tiene exactamente 90 ítems", () => {
    expect(ENNEAGRAM_ITEMS.length).toBe(90);
  });

  it("tiene 10 ítems por cada tipo (1..9)", () => {
    const counts = new Map<EnneagramType, number>();
    for (const item of ENNEAGRAM_ITEMS) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }
    for (let t = 1; t <= 9; t++) {
      expect(counts.get(t as EnneagramType)).toBe(10);
    }
  });

  it("tiene IDs únicos", () => {
    const ids = ENNEAGRAM_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getOrderedItems", () => {
  it("devuelve los 90 ítems intercalados (no agrupados por tipo)", () => {
    const ordered = getOrderedItems();
    expect(ordered.length).toBe(90);
    // Los primeros 9 deben tocar los 9 tipos en orden 1..9.
    const firstNineTypes = ordered.slice(0, 9).map((i) => i.type);
    expect(firstNineTypes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("scoreEnneagram", () => {
  function answerAll(value: LikertAnswer): Record<string, LikertAnswer> {
    const a: Record<string, LikertAnswer> = {};
    for (const item of ENNEAGRAM_ITEMS) a[item.id] = value;
    return a;
  }

  it("con todas las respuestas a 5, todos los tipos suman 50", () => {
    const r = scoreEnneagram(answerAll(5));
    for (let t = 1; t <= 9; t++) {
      expect(r.scoresByType[`type${t as EnneagramType}`]).toBe(50);
    }
  });

  it("respuestas vacías se tratan como neutro (3) → score 30 por tipo", () => {
    const r = scoreEnneagram({});
    for (let t = 1; t <= 9; t++) {
      expect(r.scoresByType[`type${t as EnneagramType}`]).toBe(30);
    }
  });

  it("dominantType es el que tiene score más alto", () => {
    const a: Record<string, LikertAnswer> = {};
    for (const item of ENNEAGRAM_ITEMS) {
      a[item.id] = item.type === 4 ? 5 : 1;
    }
    const r = scoreEnneagram(a);
    expect(r.dominantType).toBe(4);
    expect(r.scoresByType.type4).toBe(50);
  });

  it("ranking está ordenado por score desc", () => {
    const a: Record<string, LikertAnswer> = {};
    for (const item of ENNEAGRAM_ITEMS) {
      // tipo 7 = score más alto, tipo 8 = segundo, resto neutro
      if (item.type === 7) a[item.id] = 5;
      else if (item.type === 8) a[item.id] = 4;
      else a[item.id] = 3;
    }
    const r = scoreEnneagram(a);
    expect(r.ranking[0].type).toBe(7);
    expect(r.ranking[1].type).toBe(8);
  });

  it("calcula wing entre los dos vecinos del tipo dominante", () => {
    // Dominante = 5; sus vecinos en el círculo son 4 y 6.
    const a: Record<string, LikertAnswer> = {};
    for (const item of ENNEAGRAM_ITEMS) {
      if (item.type === 5) a[item.id] = 5;
      else if (item.type === 4) a[item.id] = 4;
      else a[item.id] = 1;
    }
    const r = scoreEnneagram(a);
    expect(r.dominantType).toBe(5);
    expect(r.wing).toBe(4);
  });
});
