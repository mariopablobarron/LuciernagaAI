import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { updateGoalAction, type GoalWithProgress } from "@/services/goals";

function serializeGoal(goal: GoalWithProgress | null) {
  if (!goal) {
    return null;
  }

  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    completedCount: goal.completedCount,
    totalCount: goal.totalCount,
    progress: goal.progress,
    actions: goal.actions.map((action) => ({
      id: action.id,
      description: action.description,
      completed: action.completed,
      createdAt: action.createdAt.toISOString(),
    })),
  };
}

type PatchActionBody = {
  actionId?: string;
  completed?: boolean;
};

export async function PATCH(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const body = (await req.json()) as PatchActionBody;
    const actionId = body.actionId?.trim() ?? "";

    if (!actionId || typeof body.completed !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "actionId y completed son requeridos",
        },
        { status: 400 }
      );
    }

    const goal = await updateGoalAction({
      userId: identity.userId,
      actionId,
      completed: body.completed,
    });

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          error: "Acción no encontrada",
        },
        { status: 404 }
      );
    }

    logInfo("STATE", "goal_action_updated", {
      userId: identity.userId,
      actionId,
      completed: body.completed,
      goalId: goal.id,
    });

    const response = NextResponse.json({
      success: true,
      goal: serializeGoal(goal),
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        { success: false, error: "Token inválido o expirado" },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("STATE", error, { route: "/api/actions", method: "PATCH" });
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo actualizar la acción",
      },
      { status: 500 }
    );
  }
}
