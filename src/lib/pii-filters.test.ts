import { detectPII, hasPII, assertNoPII, PII_USER_MESSAGE } from "./pii-filters";

describe("detectPII", () => {
  describe("positivos — debe detectar", () => {
    it.each([
      ["email suelto", "escríbeme a juan@example.com"],
      ["email con subdominio", "test@mail.company.co"],
      ["teléfono español 9 dígitos", "llámame al 666778899"],
      ["teléfono con espacios", "mi tel 600 11 22 33"],
      ["teléfono con guiones", "+34-666-778-899"],
      ["teléfono con paréntesis", "(123) 456-7890 hola"],
      ["URL completa", "mira https://instagram.com/juan"],
      ["URL sin protocolo", "visita www.miblog.es ahora"],
      ["dominio suelto", "búscame en ejemplo.com"],
      ["handle de red", "sígueme @mi_insta_123"],
      ["plataforma instagram mencionada", "vamos a instagram"],
      ["plataforma whatsapp mencionada", "mándame por whatsapp"],
      ["telegram", "en telegram soy X"],
      ["tiktok", "soy de tiktok"],
      ["DNI español", "mi dni es 12345678Z"],
      ["NIE español", "X1234567L es mi nie"],
      ["IBAN", "IBAN ES91 2100 0418 4502 0005 1332"],
    ])("%s", (_label, text) => {
      expect(hasPII(text)).toBe(true);
    });
  });

  describe("negativos — NO debe detectar", () => {
    it.each([
      ["texto normal", "hoy he podido ir al gimnasio y me sentí mejor"],
      ["expresión emocional", "creo que mañana irá mejor"],
      ["saludo", "hola muy buenas"],
      ["solo dígitos cortos", "llevo 3 días así"],
      ["años", "vivo aquí desde 2026"],
      ["número corto", "son las 15:30"],
      ["palabra con @ sin handle", "quiero estar @ solas"],
      ["punto suspensivo", "no sé... ya veremos"],
    ])("%s", (_label, text) => {
      expect(hasPII(text)).toBe(false);
    });
  });

  it("clasifica los tipos detectados", () => {
    const matches = detectPII("mi email es x@y.com y mi tel 666778899");
    const kinds = matches.map((m) => m.kind);
    expect(kinds).toContain("email");
    expect(kinds).toContain("phone");
  });

  it("no confunde email con handle", () => {
    const matches = detectPII("soy juan@example.com");
    const kinds = new Set(matches.map((m) => m.kind));
    expect(kinds.has("email")).toBe(true);
    expect(kinds.has("handle")).toBe(false);
  });
});

describe("assertNoPII", () => {
  it("devuelve null cuando no hay PII", () => {
    expect(assertNoPII("hola", "mundo")).toBeNull();
  });

  it("devuelve error con mensaje pedagógico si hay PII", () => {
    const result = assertNoPII("mi email juan@x.com", "");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("PERSONAL_DATA");
    expect(result?.message).toBe(PII_USER_MESSAGE);
    expect(result?.kinds).toContain("email");
  });

  it("agrega kinds de varios campos", () => {
    const result = assertNoPII("666778899", "@mi_insta");
    expect(result?.kinds).toEqual(expect.arrayContaining(["phone", "handle"]));
  });

  it("ignora texto vacío y nulo", () => {
    expect(assertNoPII(null, undefined, "")).toBeNull();
  });
});
