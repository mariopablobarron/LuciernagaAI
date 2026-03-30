import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import {
  createGoalForUser,
  getActiveGoalForUser,
  type GoalWithProgress,
} from "@/services/goals";

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

export async function GET(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const goal = await getActiveGoalForUser(identity.userId);

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

    logError("STATE", error, { route: "/api/goals", method: "GET" });
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo cargar el objetivo activo",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const body = (await req.json()) as { title?: string; actions?: string[] };
    const title = body.title?.trim() ?? "";

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "title es requerido",
        },
        { status: 400 }
      );
    }

    const goal = await createGoalForUser({
      userId: identity.userId,
      title,
      actions: body.actions,
    });

    logInfo("STATE", "goal_created_manual", {
      userId: identity.userId,
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

    const message = error instanceof Error ? error.message : "GOAL_CREATE_FAILED";
    if (message === "GOAL_TITLE_REQUIRED") {
      return NextResponse.json(
        {
          success: false,
          error: "title es requerido",
        },
        { status: 400 }
      );
    }

    logError("STATE", error, { route: "/api/goals", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo crear el objetivo",
      },
      { status: 500 }
    );
  }
}
