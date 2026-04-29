import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  ageToRange,
  isAgeBucket,
  isAgeRange,
  isElderRange,
  isMinorRange,
  rangeToTier,
} from "./age-range";

describe("ageToRange", () => {
  it("blocks ages under 14", () => {
    expect(ageToRange(0)).toBeNull();
    expect(ageToRange(13)).toBeNull();
    expect(ageToRange(13.99)).toBeNull();
  });

  it("classifies 14-17 as adolescents", () => {
    expect(ageToRange(14)).toBe("14_17");
    expect(ageToRange(17)).toBe("14_17");
  });

  it("classifies 18-29 as young adults", () => {
    expect(ageToRange(18)).toBe("18_29");
    expect(ageToRange(29)).toBe("18_29");
  });

  it("classifies 30-49 as adults", () => {
    expect(ageToRange(30)).toBe("30_49");
    expect(ageToRange(49)).toBe("30_49");
  });

  it("classifies 50-69 as mid-late adults", () => {
    expect(ageToRange(50)).toBe("50_69");
    expect(ageToRange(69)).toBe("50_69");
  });

  it("classifies 70+ as elders", () => {
    expect(ageToRange(70)).toBe("70_plus");
    expect(ageToRange(105)).toBe("70_plus");
  });

  it("handles invalid input", () => {
    expect(ageToRange(NaN)).toBeNull();
    expect(ageToRange(-5)).toBeNull();
    expect(ageToRange(Infinity)).toBeNull(); // not finite is filtered
  });
});

describe("isAgeRange / isAgeBucket", () => {
  it("recognises valid ranges", () => {
    for (const r of AGE_RANGES) {
      expect(isAgeRange(r)).toBe(true);
      expect(isAgeBucket(r)).toBe(true);
    }
  });

  it("under_14 is a bucket but not a stored range", () => {
    expect(isAgeBucket("under_14")).toBe(true);
    expect(isAgeRange("under_14")).toBe(false);
  });

  it("rejects garbage", () => {
    expect(isAgeRange("18-29")).toBe(false);
    expect(isAgeRange(42)).toBe(false);
    expect(isAgeRange(null)).toBe(false);
    expect(isAgeBucket("teen")).toBe(false);
  });
});

describe("isMinorRange / isElderRange", () => {
  it("only 14_17 is minor", () => {
    expect(isMinorRange("14_17")).toBe(true);
    expect(isMinorRange("18_29")).toBe(false);
    expect(isMinorRange("70_plus")).toBe(false);
  });

  it("only 70_plus is elder", () => {
    expect(isElderRange("70_plus")).toBe(true);
    expect(isElderRange("50_69")).toBe(false);
    expect(isElderRange("14_17")).toBe(false);
  });
});

describe("rangeToTier", () => {
  it("maps adolescents to minor tier", () => {
    expect(rangeToTier("14_17")).toBe("minor");
  });

  it("maps 18-69 to adult tier", () => {
    expect(rangeToTier("18_29")).toBe("adult");
    expect(rangeToTier("30_49")).toBe("adult");
    expect(rangeToTier("50_69")).toBe("adult");
  });

  it("maps 70+ to elder tier", () => {
    expect(rangeToTier("70_plus")).toBe("elder");
  });
});

describe("AGE_RANGE_LABELS", () => {
  it("has a Spanish label per range", () => {
    for (const r of AGE_RANGES) {
      expect(AGE_RANGE_LABELS[r]).toBeTruthy();
      expect(AGE_RANGE_LABELS[r]).toMatch(/años/);
    }
  });
});
