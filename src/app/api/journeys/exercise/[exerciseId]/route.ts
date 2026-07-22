import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  getExerciseDetail,
  startExercise,
  completeExercise,
  skipExercise,
} from "@/services/journeys";
import type { ExerciseResponse } from "@/domain/journeys/types";

type Params = { params: Promise<{ exerciseId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const { exerciseId } = await params;
    const detail = await getExerciseDetail(identity.userId, exerciseId);

    if (!detail) {
      return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
    }

    const res = NextResponse.json({ success: true, exercise: detail });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (e: unknown) {
    logError("JOURNEY", e, { route: "GET /api/journeys/exercise/[exerciseId]" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const { exerciseId } = await params;
    const body = (await req.json()) as {
      action: "start" | "complete" | "skip";
      responses?: ExerciseResponse[];
      reflection?: string;
    };

    const withCookie = (payload: Record<string, unknown>) => {
      const res = NextResponse.json(payload);
      if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
      return res;
    };

    switch (body.action) {
      case "start": {
        await startExercise(identity.userId, exerciseId);
        return withCookie({ success: true });
      }
      case "complete": {
        const result = await completeExercise(identity.userId, exerciseId, {
          responses: body.responses,
          reflection: body.reflection,
        });
        return withCookie({ success: true, progress: result.progress });
      }
      case "skip": {
        await skipExercise(identity.userId, exerciseId);
        return withCookie({ success: true });
      }
      default:
        return NextResponse.json(
          { success: false, error: "Acción no válida" },
          { status: 400 },
        );
    }
  } catch (e: unknown) {
    logError("JOURNEY", e, { route: "POST /api/journeys/exercise/[exerciseId]" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
