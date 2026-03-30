import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import {
  analyzeEmotionalProfile,
  updateEmotionalProfile,
} from "@/services/emotional-model";
import { detectUserState, updateUserState } from "@/services/state";

function extractMood(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("bien") ||
    lowerMessage.includes("mejor") ||
    lowerMessage.includes("progreso")
  ) {
    return "positive";
  }

  if (
    lowerMessage.includes("mal") ||
    lowerMessage.includes("peor") ||
    lowerMessage.includes("fracaso")
  ) {
    return "negative";
  }

  return "neutral";
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrismaClient();

    const body = (await req.json()) as { response?: string };
    const responseText = body.response?.trim() ?? "";
    const identity = resolveIdentity(req);
    const userId = identity.userId;

    if (!responseText) {
      return NextResponse.json(
        { error: "response required" },
        { status: 400 }
      );
    }

    // 1. GUARDAR CHECK-IN
    logInfo("STATE", "daily_checkin_create_started", { userId });
    const checkin = await prisma.dailyCheckin.create({
      data: {
        userId,
        response: responseText,
        mood: extractMood(responseText),
      },
    });
    logInfo("STATE", "daily_checkin_create_completed", { checkinId: checkin.id, userId });

    // 2. DETECTAR ESTADO
    const state = detectUserState(responseText);
    logInfo("STATE", "checkin_state_detected", { userId, state });

    // 3. GUARDAR/ACTUALIZAR ESTADO
    await updateUserState(userId, state);
    try {
      await updateEmotionalProfile(userId, analyzeEmotionalProfile(responseText, []));
    } catch (emotionalError: unknown) {
      logError("EMOTION", emotionalError, {
        route: "/api/checkin",
        userId,
      });
    }

    // 4. CONTAR RESPUESTAS DEL DÍA
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCheckins = await prisma.dailyCheckin.count({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });

    const apiResponse = NextResponse.json({
      ok: true,
      checkin,
      state,
      checkinsToday: todayCheckins,
      userId,
    });
    if (identity.shouldSetCookie) {
      attachSessionCookie(apiResponse, identity.sessionToken);
    }
    return apiResponse;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        { error: "INVALID_SESSION_TOKEN", message: "Sesión inválida o expirada." },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("STATE", error, { action: "save_checkin_failed" });
    return NextResponse.json(
      { error: "Error saving checkin" },
      { status: 500 }
    );
  }
}
