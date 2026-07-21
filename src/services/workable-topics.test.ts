import { detectWorkableTopics, WORKABLE_TOPICS } from "./workable-topics";

describe("detectWorkableTopics — síndrome del impostor", () => {
  const shouldDetect = [
    "creo que tengo síndrome del impostor",
    "me siento un impostor en mi trabajo",
    "me siento una impostora total",
    "a veces siento que soy un fraude",
    "tengo miedo de que me van a descubrir",
    "tarde o temprano se van a dar cuenta de que no valgo",
    "la verdad es que no me merezco este puesto",
    "no me lo he ganado, ha sido suerte",
    "todo ha sido suerte, no fue mérito mío",
    "no sé cómo he llegado aquí, cualquiera podría hacer mi trabajo",
    "creen que soy mejor de lo que soy",
    "es cuestión de tiempo que se den cuenta",
    "NO ME LO MEREZCO",
  ];

  test.each(shouldDetect)("detecta: %s", (msg) => {
    expect(detectWorkableTopics(msg)).toContain("impostor");
  });

  const shouldNotDetect = [
    "hoy he tenido un buen día en el trabajo",
    "quiero mejorar mi productividad",
    "estoy pensando en cambiar de trabajo",
    "me siento cansado últimamente",
    "he tenido suerte de encontrar aparcamiento", // "suerte" sin contexto de logro
    "no sé qué cocinar hoy",
    "mi jefe me ha felicitado por el proyecto",
  ];

  test.each(shouldNotDetect)("NO detecta (falso positivo): %s", (msg) => {
    expect(detectWorkableTopics(msg)).not.toContain("impostor");
  });

  test("acentos inconsistentes también disparan (normalización NFD)", () => {
    expect(detectWorkableTopics("sindrome del impostor")).toContain("impostor");
    expect(detectWorkableTopics("síndrome del impostor")).toContain("impostor");
  });

  test("mensaje neutro devuelve lista vacía", () => {
    expect(detectWorkableTopics("hola, ¿cómo estás?")).toEqual([]);
  });
});

describe("catálogo WORKABLE_TOPICS", () => {
  test("impostor tiene guía y ejercicio con pasos", () => {
    const t = WORKABLE_TOPICS.impostor;
    expect(t.mentorGuidance.length).toBeGreaterThan(0);
    expect(t.exercise.steps.length).toBeGreaterThanOrEqual(3);
  });

  test("la guía NO invita a diagnosticar (no dice 'tienes síndrome')", () => {
    // Barandilla AI Act: psicoeducación, no diagnóstico.
    expect(WORKABLE_TOPICS.impostor.mentorGuidance.toLowerCase()).toContain("no etiquetes");
  });
});
