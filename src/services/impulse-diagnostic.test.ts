import {
  assignImpulseProfile,
  scoreDiagnosticResponses,
} from "@/services/impulse-diagnostic";

describe("impulse diagnostic", () => {
  it("detecta potencial alto cuando claridad, energía y disciplina son fuertes", () => {
    const scores = scoreDiagnosticResponses({
      claridad_1: 5,
      claridad_2: 1,
      autoestima_1: 5,
      autoestima_2: 1,
      energia_1: 5,
      energia_2: 1,
      disciplina_1: 5,
      disciplina_2: 1,
      social_1: 4,
      social_2: 2,
      disciplina_3: 5,
      claridad_3: 1,
    });

    expect(assignImpulseProfile(scores)).toBe("POTENCIAL_ALTO");
    expect(scores.total).toBeGreaterThanOrEqual(80);
  });

  it("detecta desmotivación cuando energía y disciplina están muy bajas", () => {
    const scores = scoreDiagnosticResponses({
      claridad_1: 2,
      claridad_2: 4,
      autoestima_1: 2,
      autoestima_2: 4,
      energia_1: 1,
      energia_2: 5,
      disciplina_1: 1,
      disciplina_2: 5,
      social_1: 3,
      social_2: 3,
      disciplina_3: 1,
      claridad_3: 4,
    });

    expect(assignImpulseProfile(scores)).toBe("DESMOTIVADO");
    expect(scores.energia).toBeLessThanOrEqual(25);
  });
});
