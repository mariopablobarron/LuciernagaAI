import {
  describeTransformationPhase,
  inferTransformationPhase,
} from "@/services/transformation";

describe("transformation service", () => {
  it("detecta fase de bloqueo cuando no hay estructura ni avance", () => {
    expect(
      inferTransformationPhase({
        state: "bloqueo",
        intent: "problem",
        hasGoal: false,
        totalActions: 0,
        pendingActionsCount: 0,
        completedActionsCount: 0,
        avoidanceCount: 0,
        conversationMessageCount: 1,
      })
    ).toBe("bloqueo");
  });

  it("detecta fase de acción cuando hay acciones abiertas", () => {
    expect(
      inferTransformationPhase({
        state: "claridad",
        intent: "goal_creation",
        hasGoal: true,
        totalActions: 3,
        pendingActionsCount: 2,
        completedActionsCount: 1,
        avoidanceCount: 0,
        conversationMessageCount: 4,
      })
    ).toBe("accion");
  });

  it("describe la fase para el prompt del coach", () => {
    expect(describeTransformationPhase("consistencia")).toContain("habito");
  });
});
