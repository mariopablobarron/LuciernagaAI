import { describe, it, expect } from "@jest/globals";
import { detectDomain, buildDomainGuidance } from "./domain";

describe("detectDomain", () => {
  describe("relational", () => {
    it.each([
      "estoy mal con mi pareja, hemos discutido",
      "mi novia me ha dejado",
      "ruptura con mi marido",
      "me he peleado con mi mejor amiga",
      "infidelidad, no sé qué hacer",
    ])("detecta relacional en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("relational");
    });
  });

  describe("work", () => {
    it.each([
      "mi jefe me ha despedido",
      "estoy en paro desde hace meses",
      "no aguanto a mis colegas de la oficina",
      "necesito un ascenso o me voy",
    ])("detecta work en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("work");
    });
  });

  describe("academic", () => {
    it.each([
      "tengo un examen mañana y no he estudiado",
      "no me sale la tesis",
      "me presento a unas oposiciones",
      "voy a suspender la asignatura",
    ])("detecta academic en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("academic");
    });
  });

  describe("health", () => {
    it.each([
      "no duermo bien desde hace semanas",
      "tengo insomnio crónico",
      "me duele todo el cuerpo",
      "estoy sin energía, fatiga total",
    ])("detecta health en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("health");
    });
  });

  describe("financial", () => {
    it.each([
      "no llego a fin de mes con la hipoteca",
      "tengo deudas que no puedo pagar",
      "el sueldo no me da",
      "el banco me ha bloqueado la cuenta",
    ])("detecta financial en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("financial");
    });
  });

  describe("existential", () => {
    it.each([
      "no sé quién soy ni para qué estoy aquí",
      "estoy en una crisis existencial",
      "he perdido el sentido de mi vida",
      "no sé en qué creer ya",
    ])("detecta existential en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("existential");
    });
  });

  describe("family_role", () => {
    it.each([
      "mi madre está enferma y la cuido yo sola",
      "no aguanto ser madre",
      "mi padre exige demasiado",
      "ser cuidador me agota",
    ])("detecta family_role en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("family_role");
    });
  });

  describe("social", () => {
    it.each([
      "me siento muy solo",
      "no tengo a nadie con quien hablar",
      "no encajo en ningún grupo",
      "estoy aislado del mundo",
    ])("detecta social en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("social");
    });
  });

  describe("creative", () => {
    it.each([
      "estoy bloqueado con mi novela",
      "se me ha acabado la inspiración",
      "no soy capaz de pintar",
      "tengo bloqueo creativo",
    ])("detecta creative en: %s", (msg) => {
      expect(detectDomain(msg)).toBe("creative");
    });
  });

  describe("null cases", () => {
    it.each([
      "hola buenos días",
      "gracias",
      "vale, lo intentaré",
      "no sé",
      "",
    ])("devuelve null para mensaje sin keywords: %s", (msg) => {
      expect(detectDomain(msg)).toBeNull();
    });
  });

  describe("priority resolution", () => {
    it("prioriza financial sobre work cuando hay 'sueldo' + 'hipoteca'", () => {
      // 'sueldo' está en financial, pero 'trabajo' también dispararía work.
      // financial gana por prioridad cuando ambos dominios matchean.
      expect(detectDomain("no me llega el sueldo y la hipoteca pesa")).toBe("financial");
    });

    it("prioriza family_role sobre health cuando hay 'mi madre enferma'", () => {
      // 'enferma' dispara health, 'mi madre' + 'cuido' dispara family_role.
      // family_role gana porque la causa del problema es el rol del usuario,
      // no la enfermedad ajena.
      expect(detectDomain("mi madre está enferma y la cuido yo sola")).toBe("family_role");
    });

    it("prioriza academic cuando hay 'examen' aunque mencione otra área", () => {
      expect(detectDomain("no duermo bien por culpa del examen")).toBe("academic");
    });
  });
});

describe("buildDomainGuidance", () => {
  it("devuelve string vacío para null", () => {
    expect(buildDomainGuidance(null)).toBe("");
  });

  it("incluye la etiqueta humana del dominio", () => {
    const guidance = buildDomainGuidance("relational");
    expect(guidance).toContain("relacional");
    expect(guidance).toContain("pareja");
  });

  it("instruye no mencionar la etiqueta literalmente", () => {
    const guidance = buildDomainGuidance("work");
    expect(guidance).toMatch(/NO menciones la etiqueta literal/i);
  });

  it("propone recurso externo coherente con el dominio (health → médico)", () => {
    const guidance = buildDomainGuidance("health");
    expect(guidance.toLowerCase()).toContain("médico");
  });
});
