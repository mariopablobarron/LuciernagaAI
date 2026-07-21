import { matchGlossaryTopics, normalizeText, type GlossaryTopicData } from "./glossary";

const IMPOSTOR: GlossaryTopicData = {
  slug: "impostor",
  label: "Síndrome del impostor",
  triggers: [
    "sindrome del impostor",
    "me siento un impostor",
    "me siento una impostora",
    "soy un fraude",
    "me van a descubrir",
    "no me lo merezco",
    "no me lo he ganado",
    "todo ha sido suerte",
    "solo tuve suerte",
    "no fue merito mio",
    "cualquiera podria hacer mi trabajo",
    "creen que soy mejor de lo que soy",
    "es cuestion de tiempo que se den cuenta",
  ],
  mentorGuidance: "…",
  exerciseTitle: "El registro de evidencia",
  exerciseGoal: "…",
  exerciseSteps: ["a", "b", "c"],
};

const TOPICS = [IMPOSTOR];

describe("matchGlossaryTopics — impostor", () => {
  const shouldMatch = [
    "creo que tengo síndrome del impostor",
    "me siento un impostor en el trabajo",
    "a veces siento que soy un fraude",
    "tengo miedo de que me van a descubrir",
    "la verdad es que no me lo merezco",
    "no me lo he ganado",
    "todo ha sido suerte, nada más",
    "cualquiera podría hacer mi trabajo",
    "creen que soy mejor de lo que soy",
    "NO ME LO MEREZCO",
    "sindrome del impostor", // sin acentos
  ];

  test.each(shouldMatch)("detecta: %s", (msg) => {
    expect(matchGlossaryTopics(msg, TOPICS).map((t) => t.slug)).toContain("impostor");
  });

  const shouldNotMatch = [
    "hoy he tenido un buen día",
    "quiero mejorar mi productividad",
    "he tenido suerte de encontrar aparcamiento", // "suerte" sin "todo ha sido"
    "mi jefe me ha felicitado",
    "no sé qué cocinar hoy",
  ];

  test.each(shouldNotMatch)("NO detecta (falso positivo): %s", (msg) => {
    expect(matchGlossaryTopics(msg, TOPICS)).toEqual([]);
  });

  test("mensaje vacío o neutro devuelve lista vacía", () => {
    expect(matchGlossaryTopics("", TOPICS)).toEqual([]);
    expect(matchGlossaryTopics("hola, ¿qué tal?", TOPICS)).toEqual([]);
  });

  test("sin temas cargados no rompe", () => {
    expect(matchGlossaryTopics("me van a descubrir", [])).toEqual([]);
  });

  test("disparador vacío no matchea con substring espurio", () => {
    const t: GlossaryTopicData = { ...IMPOSTOR, triggers: [""] };
    expect(matchGlossaryTopics("cualquier cosa", [t])).toEqual([]);
  });
});

describe("normalizeText", () => {
  test("quita acentos, puntuación y baja a minúsculas", () => {
    expect(normalizeText("¡Síndrome, del IMPOSTOR!")).toBe("sindrome del impostor");
  });
});
