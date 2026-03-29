import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function detectUserState(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("no sé") ||
    lowerMessage.includes("no entiendo") ||
    lowerMessage.includes("confundido") ||
    lowerMessage.includes("perdido")
  ) {
    return "perdido";
  }

  if (
    lowerMessage.includes("ansiedad") ||
    lowerMessage.includes("ansioso") ||
    lowerMessage.includes("pánico") ||
    lowerMessage.includes("miedo") ||
    lowerMessage.includes("nervioso")
  ) {
    return "ansioso";
  }

  if (
    lowerMessage.includes("bloqueado") ||
    lowerMessage.includes("atrapado") ||
    lowerMessage.includes("no puedo") ||
    lowerMessage.includes("parálisis") ||
    lowerMessage.includes("estancado")
  ) {
    return "bloqueado";
  }

  return "normal";
}

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
    const { userId, response } = await req.json();

    if (!userId || !response) {
      return NextResponse.json(
        { error: "userId y response required" },
        { status: 400 }
      );
    }

    // 1. GUARDAR CHECK-IN
    const checkin = await prisma.dailyCheckin.create({
      data: {
        userId,
        response,
        mood: extractMood(response),
      },
    });

    // 2. DETECTAR ESTADO
    const state = detectUserState(response);

    // 3. GUARDAR/ACTUALIZAR ESTADO
    await prisma.userState.upsert({
      where: { userId },
      update: { state, updatedAt: new Date() },
      create: { userId, state },
    });

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

    return NextResponse.json({
      ok: true,
      checkin,
      state,
      checkinsToday: todayCheckins,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error saving checkin" },
      { status: 500 }
    );
  }
}
