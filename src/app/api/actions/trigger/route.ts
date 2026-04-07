import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { getPrismaClient } from "@/db/prisma";
import { createGoalForUser, getActiveGoalForUser } from "@/services/goals";
import { trackSafe } from "@/services/events";
import { updateUserState } from "@/services/state";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";
import { checkRateLimit } from "@/lib/rate-limit";
import type { UserState } from "@/domain/types";
import type { TransformationPhase } from "@/services/transformation";

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerBody = {
  type?: string;
  content?: string;
};

type TriggerResponse = {
  success: boolean;
  updatedState: UserState;
};

// ─── State transition logic ───────────────────────────────────────────────────

const GOAL_TITLES: Record<string, string> = {
  name_block: "Nombrar lo que estoy evitando",
  next_step: "Definir mi siguiente paso",
  close_pending: "Cerrar algo pendiente",
  order_thoughts: "Ordenar mis pensamientos",
};

/**
 * Computes the next domain state based on which explore action was completed.
 * Only transitions forward — never regresses.
 */
function computeNextState(current: UserState, type: string): UserState {
  switch (type) {
    case "name_block":
      return current === "bloqueo" || current === "neutral" ? "duda" : current;
    case "next_step":
      return current === "bloqueo" || current === "duda" || current === "neutral"
        ? "claridad"
        : current;
    case "order_thoughts":
      return current === "ansiedad" ? "duda" : current;
    case "close_pending":
      return current === "bloqueo" || current === "ansiedad" ? "duda" : current;
    default:
      return current;
  }
}

function computePhase(state: UserState): TransformationPhase {
  if (state === "claridad") return "accion";
  if (state === "duda") return "decision";
  if (state === "bloqueo" || state === "ansiedad") return "bloqueo";
  return "exploracion";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest
): Promise<NextResponse<TriggerResponse | { success: false; error: string }>> {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;

  try {
    identity = await resolveIdentity(req, { allowAnonymousBootstrap: true });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { success: false as const, error: "Token inválido o expirado" },
        { status: 401 }
      );
      clearSessionCookie(res);
      return res;
    }
    logError("EXPLORE", e, { route: "/api/actions/trigger" });
    return NextResponse.json({ success: false as const, error: "Error interno" }, { status: 500 });
  }

  let body: TriggerBody;
  try {
    body = (await req.json()) as TriggerBody;
  } catch {
    return NextResponse.json({ success: false as const, error: "Body inválido" }, { status: 400 });
  }

  const type = body.type?.trim();
  if (!type) {
    return NextResponse.json(
      { success: false as const, error: "type es requerido" },
      { status: 400 }
    );
  }

  const content = body.content?.trim() ?? "";

  // Rate limit: 30 triggers/min per user
  const rl = checkRateLimit(`trigger:${identity.userId}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false as const, error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  try {
    const prisma = getPrismaClient();

    // 1. Read current state + crisis flag ────────────────────────────────────
    const stateRecord = await prisma.userState.findUnique({
      where: { userId: identity.userId },
      select: { state: true, crisisActive: true },
    });
    const currentState: UserState = (stateRecord?.state as UserState) ?? "neutral";
    const crisisActive = stateRecord?.crisisActive ?? false;

    // 2. Compute & persist next state ────────────────────────────────────────
    const updatedState = computeNextState(currentState, type);
    const stateChanged = updatedState !== currentState;

    if (stateChanged) {
      await updateUserState(identity.userId, updatedState, {
        transformationPhase: computePhase(updatedState),
      });
    }

    // 3. Create goal only if user has none (explore = entry point) ───────────
    const activeGoal = await getActiveGoalForUser(identity.userId);
    let goalId: string | undefined;

    if (!activeGoal) {
      const goalTitle =
        GOAL_TITLES[type] ?? (content.slice(0, 80) || "Exploración inicial");
      const goal = await createGoalForUser({
        userId: identity.userId,
        title: goalTitle,
        actions: content ? [content] : undefined,
      });
      goalId = goal.id;
    } else {
      goalId = activeGoal.id;
    }

    // 4. Track event ─────────────────────────────────────────────────────────
    await trackSafe({
      userId: identity.userId,
      type: "ACTION_COMPLETED",
      metadata: {
        source: "explore",
        actionType: type,
        goalId,
        previousState: currentState,
        updatedState,
        stateChanged,
      },
    });

    logInfo("EXPLORE", "trigger_processed", {
      userId: identity.userId,
      actionType: type,
      previousState: currentState,
      updatedState,
      stateChanged,
    });

    // 5. Notify n8n — fire-and-forget ────────────────────────────────────────
    const n8nUrl = process.env.N8N_ACTION_WEBHOOK;
    if (n8nUrl) {
      void fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userId: identity.userId, state: updatedState }),
      }).catch((err) =>
        logError("EXPLORE", err instanceof Error ? err : new Error(String(err)), { context: "n8n_webhook", userId: identity.userId }),
      );
    }

    // 6. Telegram admin alerts (all fire-and-forget via notifyAdmin) ──────────
    if (updatedState === "bloqueo" || updatedState === "claridad") {
      notifyAdmin(
        buildAdminAlert({
          tipo: "state_change",
          userId: identity.userId,
          actionType: type,
          previousState: currentState,
          newState: updatedState,
        })
      );
    }

    if (updatedState === "ansiedad" && crisisActive) {
      notifyAdmin(
        buildAdminAlert({
          tipo: "crisis",
          userId: identity.userId,
          crisisLevel: "alto",
        })
      );
    }

    const res = NextResponse.json<TriggerResponse>({ success: true, updatedState });

    if (identity.shouldSetCookie) {
      attachSessionCookie(res, identity.sessionToken);
    }

    return res;
  } catch (error: unknown) {
    logError("EXPLORE", error, {
      route: "/api/actions/trigger",
      userId: identity.userId,
      type,
    });
    return NextResponse.json(
      { success: false as const, error: "No se pudo procesar el trigger" },
      { status: 500 }
    );
  }
}
