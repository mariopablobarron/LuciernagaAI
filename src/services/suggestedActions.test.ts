import { generateSuggestedActions } from "@/services/suggestedActions";

describe("generateSuggestedActions", () => {
  describe("acción pendiente", () => {
    it("añade chip 'Ya lo hice' como primer chip cuando hay acción pendiente", () => {
      const chips = generateSuggestedActions({
        dominantPattern: "evita_decidir",
        hasPendingActions: true,
      });
      expect(chips[0].id).toBe("action-done");
      expect(chips[0].kind).toBe("complete");
      expect(chips[0].label).toContain("Ya lo hice");
    });

    it("NO añade chip 'Ya lo hice' cuando no hay acción pendiente", () => {
      const chips = generateSuggestedActions({
        dominantPattern: "evita_decidir",
        hasPendingActions: false,
      });
      expect(chips.find((c) => c.id === "action-done")).toBeUndefined();
    });
  });

  describe("chips por patrón dominante", () => {
    it.each([
      ["evita_decidir", ["decide-options", "decide-fear"]],
      ["perfeccionismo", ["perfect-enough", "perfect-min"]],
      ["comparación", ["comp-self", "comp-why"]],
      ["miedo_al_error", ["err-reversible", "err-worst"]],
      ["procrastinación", ["procr-5min", "procr-one"]],
    ])("para patrón %s incluye chips %j", (pattern, expectedIds) => {
      const chips = generateSuggestedActions({
        dominantPattern: pattern as Parameters<typeof generateSuggestedActions>[0]["dominantPattern"],
        hasPendingActions: false,
      });
      const ids = chips.map((c) => c.id);
      for (const expectedId of expectedIds) {
        expect(ids).toContain(expectedId);
      }
    });
  });

  describe("fallback sin patrón conocido", () => {
    it("usa chips fallback cuando no hay patrón", () => {
      const chips = generateSuggestedActions({
        dominantPattern: null,
        hasPendingActions: false,
      });
      expect(chips.map((c) => c.id)).toEqual(["next-step", "explain-more"]);
    });

    it("usa chips fallback cuando dominantPattern es undefined", () => {
      const chips = generateSuggestedActions({
        dominantPattern: undefined,
        hasPendingActions: false,
      });
      expect(chips.map((c) => c.id)).toEqual(["next-step", "explain-more"]);
    });
  });

  describe("cap de chips", () => {
    it("nunca devuelve más de 3 chips", () => {
      const chips = generateSuggestedActions({
        dominantPattern: "evita_decidir",
        hasPendingActions: true,
      });
      expect(chips.length).toBeLessThanOrEqual(3);
    });

    it("con acción pendiente + patrón conocido devuelve 3 chips (1 complete + 2 send)", () => {
      const chips = generateSuggestedActions({
        dominantPattern: "procrastinación",
        hasPendingActions: true,
      });
      expect(chips).toHaveLength(3);
      expect(chips.filter((c) => c.kind === "complete")).toHaveLength(1);
      expect(chips.filter((c) => c.kind === "send")).toHaveLength(2);
    });
  });

  describe("forma de cada chip", () => {
    it("todos los chips tienen id, label, prompt y kind válidos", () => {
      const chips = generateSuggestedActions({
        dominantPattern: "miedo_al_error",
        hasPendingActions: true,
      });
      for (const chip of chips) {
        expect(chip.id).toBeTruthy();
        expect(chip.label).toBeTruthy();
        expect(chip.prompt).toBeTruthy();
        expect(["send", "complete"]).toContain(chip.kind);
      }
    });

    it("chip 'complete' tiene prompt 'ya lo hice' (compatible con detector LLM)", () => {
      const chips = generateSuggestedActions({
        dominantPattern: "evita_decidir",
        hasPendingActions: true,
      });
      const completeChip = chips.find((c) => c.kind === "complete");
      expect(completeChip).toBeDefined();
      expect(completeChip!.prompt).toBe("ya lo hice");
    });
  });
});
