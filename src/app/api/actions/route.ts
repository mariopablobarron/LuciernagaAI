import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { trackSafe } from "@/services/events";
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

type PostActionBody = {
  type?: string;
};

type PatchActionBody = {
  actionId?: string;
  completed?: boolean;
};

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;

  try {
    identity = await resolveIdentity(req);
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { success: false, error: "Token inválido o expirado" },
        { status: 401 }
      );
      clearSessionCookie(res);
      return res;
    }
    logError("ACTIONS", e, { route: "/api/actions", method: "POST" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as PostActionBody;
    const type = body.type?.trim() ?? "";

    if (!type) {
      return NextResponse.json(
        { success: false, error: "El campo 'type' es requerido" },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();
    const userAction = await prisma.userAction.create({
      data: {
        userId: identity.userId,
        type,
        status: "PENDING",
      },
    });

    logInfo("ACTIONS", "user_action_created", {
      userId: identity.userId,
      type,
      id: userAction.id,
    });

    void trackSafe({
      userId: identity.userId,
      type: "ACTION_CREATED",
      metadata: { actionId: userAction.id, actionText: type, source: "transitional_void" },
    }).catch((err) =>
      logError("ACTIONS", err instanceof Error ? err : new Error(String(err)), { context: "trackSafe/ACTION_CREATED", userId: identity.userId }),
    );

    const res = NextResponse.json({ success: true, action: userAction });
    if (identity.shouldSetCookie) {
      attachSessionCookie(res, identity.sessionToken);
    }
    return res;
  } catch (error: unknown) {
    logError("ACTIONS", error, {
      route: "/api/actions",
      method: "POST",
      userId: identity.userId,
    });
    return NextResponse.json(
      { success: false, error: "No se pudo guardar la acción" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
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

    // Track ACTION_COMPLETED or ACTION_SKIPPED event
    const eventType = body.completed ? "ACTION_COMPLETED" : "ACTION_SKIPPED";
    await trackSafe({
      userId: identity.userId,
      type: eventType,
      metadata: {
        actionId,
        goalId: goal.id,
        goalTitle: goal.title,
        progress: `${goal.completedCount}/${goal.totalCount}`,
      },
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
