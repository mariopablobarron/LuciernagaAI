import {
  buildGoalCoachContext,
  countPendingActions,
  detectActionCompletionIntent,
  detectAvoidance,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  detectGoalAvoidance,
  detectGoalIntent,
} from "@/services/goals";
import { GoalStatus } from "@prisma/client";

describe("goals service", () => {
  it("detecta intenciones de objetivo más allá de 'quiero'", () => {
    expect(detectGoalIntent("Necesito ordenar mi semana")).toBe("ordenar mi semana");
    expect(detectGoalIntent("Tengo que terminar mi tesis")).toBe("terminar mi tesis");
    expect(detectGoalIntent("No sé si dejar mi trabajo")).toBe("Decidir si dejar mi trabajo");
  });

  it("detecta evitación y señales de completado", () => {
    expect(detectGoalAvoidance("Lo haré mañana, todavía no avancé")).toBe(true);
    expect(detectAvoidance("Cambiemos de tema, ya veremos")).toBe(true);
    expect(detectActionCompletionIntent("Ya lo hice y quedó listo")).toBe(true);
    expect(detectActionPostponeIntent("Lo hago luego, no ahora")).toBe(true);
    expect(detectActionRefusalIntent("No lo voy a hacer")).toBe(true);
  });

  it("construye contexto de responsabilidad para el coach", () => {
    const context = buildGoalCoachContext(
      {
        id: "goal_1",
        title: "Terminar la tesis",
        status: GoalStatus.active,
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
    expect(context?.activeAction).toBe("Abrir el documento principal");
    expect(context?.avoidanceDetected).toBe(true);
    expect(context?.unfinishedActionsCount).toBe(2);
  });

  it("marca confrontacion cuando se acumulan mas de dos acciones abiertas", () => {
    const goal = {
      id: "goal_2",
      title: "Reordenar trabajo",
      status: GoalStatus.active,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedCount: 0,
      totalCount: 3,
      progress: 0,
      actions: [
        {
          id: "action_1",
          description: "Definir prioridad",
          completed: false,
          createdAt: new Date(),
        },
        {
          id: "action_2",
          description: "Bloquear una hora",
          completed: false,
          createdAt: new Date(),
        },
        {
          id: "action_3",
          description: "Enviar avance",
          completed: false,
          createdAt: new Date(),
        },
      ],
    };

    const context = buildGoalCoachContext(goal, "No quiero entrar en eso");

    expect(countPendingActions(goal)).toBe(3);
    expect(context?.confrontationMode).toBe(true);
  });
});
