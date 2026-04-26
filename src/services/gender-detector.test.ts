import { describe, it, expect } from "@jest/globals";
import { detectGenderInMessage } from "./gender-detector";

describe("detectGenderInMessage", () => {
  describe("feminine", () => {
    it.each([
      "soy una mujer",
      "soy mujer",
      "Soy una chica de 32",
      "mis pronombres son ella",
      "me identifico como mujer",
      "prefiero que me hablen en femenino",
      "trátame en femenino, por favor",
      "Hablame en femenino",
    ])("detecta femenino en: %s", (msg) => {
      expect(detectGenderInMessage(msg)).toBe("feminine");
    });
  });

  describe("masculine", () => {
    it.each([
      "soy un hombre",
      "soy hombre",
      "Soy un chico",
      "me identifico como hombre",
      "trátame en masculino",
      "Hablame en masculino",
    ])("detecta masculino en: %s", (msg) => {
      expect(detectGenderInMessage(msg)).toBe("masculine");
    });
  });

  describe("neutral / no-binario", () => {
    it.each([
      "soy no binario",
      "soy no-binaria",
      "soy una persona no binaria",
      "mis pronombres son elle",
      "prefiero que me hablen en neutro",
      "trátame en lenguaje neutro",
    ])("detecta neutral en: %s", (msg) => {
      expect(detectGenderInMessage(msg)).toBe("neutral");
    });
  });

  describe("no detecta", () => {
    it.each([
      "",
      "hola",
      "estoy cansado",
      "me siento mal hoy",
      "tengo un objetivo nuevo",
      "no soy una mujer fuerte ahora mismo",
      "me llaman mujer pero no me siento así",
      "como si fuera un hombre",
    ])("no detecta en: %s", (msg) => {
      expect(detectGenderInMessage(msg)).toBeNull();
    });
  });
});
