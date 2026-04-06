import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
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
    const identity = await resolveIdentity(req);
    const { exerciseId } = await params;
    const detail = await getExerciseDetail(identity.userId, exerciseId);

    if (!detail) {
      return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, exercise: detail });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    logError("JOURNEY", e, { route: "GET /api/journeys/exercise/[exerciseId]" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { exerciseId } = await params;
    const body = (await req.json()) as {
      action: "start" | "complete" | "skip";
      responses?: ExerciseResponse[];
      reflection?: string;
    };

    switch (body.action) {
      case "start": {
        await startExercise(identity.userId, exerciseId);
        return NextResponse.json({ success: true });
      }
      case "complete": {
        const result = await completeExercise(identity.userId, exerciseId, {
          responses: body.responses,
          reflection: body.reflection,
        });
        return NextResponse.json({ success: true, progress: result.progress });
      }
      case "skip": {
        await skipExercise(identity.userId, exerciseId);
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json(
          { success: false, error: "Acción no válida" },
          { status: 400 },
        );
    }
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    logError("JOURNEY", e, { route: "POST /api/journeys/exercise/[exerciseId]" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
