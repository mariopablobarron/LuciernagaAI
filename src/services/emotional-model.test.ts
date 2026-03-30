import { analyzeEmotionalProfile } from "@/services/emotional-model";

describe("analyzeEmotionalProfile", () => {
  it("detecta ansiedad con miedo al error y energia alta", () => {
    const profile = analyzeEmotionalProfile("Tengo mucho miedo a equivocarme y estoy desbordado", [
      "Llevo dias con presion y ansiedad",
      "No quiero fallar otra vez",
    ]);

    expect(profile.primaryEmotion).toBe("ansiedad");
    expect(profile.dominantPattern).toBe("miedo_al_error");
    expect(profile.energyLevel).toBe("alto");
    expect(profile.riskLevel).toBe("medium");
  });

  it("detecta procrastinacion repetida y energia baja", () => {
    const profile = analyzeEmotionalProfile("Lo sigo dejando para manana y no arranco", [
      "Ayer tambien lo pospuse",
      "Estoy sin ganas y agotado",
      "Siempre digo luego",
    ]);

    expect(profile.dominantPattern).toBe("procrastinación");
    expect(profile.energyLevel).toBe("bajo");
    expect(profile.progressTrend).toBe("igual");
  });

  it("detecta mejora y foco en estudios", () => {
    const profile = analyzeEmotionalProfile("Hoy me siento mejor y ya empece a estudiar para el examen", [
      "Ayer no sabia por donde empezar con la universidad",
      "Me sentia perdido con la tesis",
    ]);

    expect(profile.focusArea).toBe("estudios");
    expect(profile.progressTrend).toBe("mejora");
  });
});
