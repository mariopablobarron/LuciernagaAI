import {
  getHotlinesForCountry,
  formatHotlinesInline,
  detectCountryFromHeaders,
  HOTLINES,
} from "@/lib/crisis-hotlines";

describe("getHotlinesForCountry", () => {
  it.each([
    ["ES", "España", "024"],
    ["MX", "México", "55 5259 8121"],
    ["AR", "Argentina", "135"],
    ["CL", "Chile", "600 360 7777"],
    ["CO", "Colombia", "106"],
    ["US", "United States", "988"],
    ["GB", "United Kingdom", "116 123"],
    ["BR", "Brasil", "188"],
    ["FR", "France", "3114"],
  ])("devuelve hotline correcta para %s", (code, expectedCountry, expectedNumber) => {
    const country = getHotlinesForCountry(code);
    expect(country.countryName).toBe(expectedCountry);
    expect(country.suicidePrevention.number).toBe(expectedNumber);
  });

  it("acepta código en minúsculas", () => {
    expect(getHotlinesForCountry("mx").countryName).toBe("México");
    expect(getHotlinesForCountry("us").countryName).toBe("United States");
  });

  it("ignora espacios en el código", () => {
    expect(getHotlinesForCountry("  AR  ").countryName).toBe("Argentina");
  });

  it("devuelve España como fallback cuando code es null", () => {
    expect(getHotlinesForCountry(null).countryCode).toBe("ES");
  });

  it("devuelve España como fallback cuando code es undefined", () => {
    expect(getHotlinesForCountry(undefined).countryCode).toBe("ES");
  });

  it("devuelve España como fallback cuando code no existe en catálogo", () => {
    expect(getHotlinesForCountry("ZZ").countryCode).toBe("ES");
    expect(getHotlinesForCountry("XX").countryCode).toBe("ES");
  });

  it("devuelve España como fallback cuando code está vacío", () => {
    expect(getHotlinesForCountry("").countryCode).toBe("ES");
  });

  it("incluye número de emergencia en cada país", () => {
    for (const code of Object.keys(HOTLINES)) {
      const country = HOTLINES[code];
      expect(country.emergency).toMatch(/^\d{2,4}$/);
      expect(country.suicidePrevention.number).toBeTruthy();
      expect(country.countryCode).toBe(code);
    }
  });
});

describe("formatHotlinesInline", () => {
  it("formatea España sin alternativas (solo 024)", () => {
    const inline = formatHotlinesInline(getHotlinesForCountry("ES"));
    expect(inline).toContain("112");
    expect(inline).toContain("024");
    expect(inline).toContain("Línea 024");
    expect(inline).not.toContain("Teléfono de la Esperanza");
  });

  it("formatea México con alternativa", () => {
    const inline = formatHotlinesInline(getHotlinesForCountry("MX"));
    expect(inline).toContain("911");
    expect(inline).toContain("SAPTEL");
    expect(inline).toContain("Línea de la Vida");
  });

  it("formatea Chile sin alternativas (solo línea principal)", () => {
    const inline = formatHotlinesInline(getHotlinesForCountry("CL"));
    expect(inline).toContain("133");
    expect(inline).toContain("Salud Responde");
    expect(inline).not.toContain("Alternativa");
  });

  it("indica claramente qué número es de emergencia", () => {
    const inline = formatHotlinesInline(getHotlinesForCountry("US"));
    expect(inline).toMatch(/riesgo inmediato.*911/i);
    expect(inline).toContain("988");
  });
});

describe("detectCountryFromHeaders", () => {
  function makeHeaders(values: Record<string, string>): Headers {
    const h = new Headers();
    for (const [k, v] of Object.entries(values)) h.set(k, v);
    return h;
  }

  it("usa cf-ipcountry como prioridad principal", () => {
    const headers = makeHeaders({
      "cf-ipcountry": "MX",
      "x-vercel-ip-country": "ES",
    });
    expect(detectCountryFromHeaders(headers)).toBe("MX");
  });

  it("cae a x-vercel-ip-country si no hay cf-ipcountry", () => {
    const headers = makeHeaders({ "x-vercel-ip-country": "AR" });
    expect(detectCountryFromHeaders(headers)).toBe("AR");
  });

  it("cae a x-country como último header", () => {
    const headers = makeHeaders({ "x-country": "br" });
    expect(detectCountryFromHeaders(headers)).toBe("BR");
  });

  it("normaliza a uppercase", () => {
    const headers = makeHeaders({ "cf-ipcountry": "co" });
    expect(detectCountryFromHeaders(headers)).toBe("CO");
  });

  it("usa fallback si todos los headers están ausentes", () => {
    const headers = makeHeaders({});
    expect(detectCountryFromHeaders(headers, "FR")).toBe("FR");
  });

  it("devuelve ES si no hay headers ni fallback", () => {
    expect(detectCountryFromHeaders(makeHeaders({}))).toBe("ES");
  });

  it("ignora headers inválidos (longitud distinta de 2)", () => {
    const headers = makeHeaders({ "cf-ipcountry": "ESP" });
    expect(detectCountryFromHeaders(headers)).toBe("ES"); // fallback
  });

  it("ignora headers con caracteres no alfa", () => {
    const headers = makeHeaders({ "cf-ipcountry": "1A" });
    expect(detectCountryFromHeaders(headers)).toBe("ES");
  });

  it("ignora fallback inválido", () => {
    const headers = makeHeaders({});
    expect(detectCountryFromHeaders(headers, "ESP")).toBe("ES");
    expect(detectCountryFromHeaders(headers, "")).toBe("ES");
  });
});
