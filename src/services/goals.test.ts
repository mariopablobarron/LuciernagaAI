import {
  buildGoalCoachContext,
  detectActionCompletionIntent,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  detectGoalAvoidance,
  detectGoalIntent,
} from "@/services/goals";

describe("goals service", () => {
  it("detecta intenciones de objetivo más allá de 'quiero'", () => {
    expect(detectGoalIntent("Necesito ordenar mi semana")).toBe("ordenar mi semana");
    expect(detectGoalIntent("Tengo que terminar mi tesis")).toBe("terminar mi tesis");
  });

  it("detecta evitación y señales de completado", () => {
    expect(detectGoalAvoidance("Lo haré mañana, todavía no avancé")).toBe(true);
    expect(detectActionCompletionIntent("Ya lo hice y quedó listo")).toBe(true);
    expect(detectActionPostponeIntent("Lo hago luego, no ahora")).toBe(true);
    expect(detectActionRefusalIntent("No lo voy a hacer")).toBe(true);
  });

  it("construye contexto de responsabilidad para el coach", () => {
    const context = buildGoalCoachContext(
      {
        id: "goal_1",
        title: "Terminar la tesis",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        completedCount: 0,
        totalCount: 2,
        progress: 0,
        actions: [
          {
            id: "action_1",
            description: "Abrir el documento principal",
            completed: false,
            createdAt: new Date(),
          },
          {
            id: "action_2",
            description: "Escribir el índice",
            completed: false,
            createdAt: new Date(),
          },
        ],
      },
      "Lo dejo para mañana"
    );

    expect(context?.pendingActions).toHaveLength(2);
    expect(context?.avoidanceDetected).toBe(true);
  });
});
