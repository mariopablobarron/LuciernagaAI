import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.count();

    const logs = await prisma.dailyLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const totalLogs = logs.length;

    const confusionMessages = messages.filter(m =>
      m.content.toLowerCase().includes("no sé") ||
      m.content.toLowerCase().includes("confund")
    );

    let insights = [];

    if (logs.length < 10) {
      insights.push({
        type: "engagement",
        title: "Bajo uso del sistema",
        content: "Los usuarios no están realizando suficientes check-ins.",
        action: "Simplificar el check-in y reducir fricción."
      });
    }

    if (confusionMessages.length > 5) {
      insights.push({
        type: "clarity",
        title: "Falta de claridad en usuarios",
        content: "Muchos usuarios expresan confusión o falta de dirección.",
        action: "Mejorar el diagnóstico inicial y preguntas clave."
      });
    }

    const createdInsights = await Promise.all(
      insights.map(i => prisma.insight.create({ data: i }))
    );

    return NextResponse.json({
      ok: true,
      insights: createdInsights,
      stats: {
        users,
        totalLogs,
        confusionMessages: confusionMessages.length,
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error generating insights" }, { status: 500 });
  }
}
