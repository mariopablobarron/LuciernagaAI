import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // ===== RECOLECTAR DATOS =====

    // 1. Contar usuarios activos (últimos 7 días)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        lastSeen: {
          gte: sevenDaysAgo,
        },
      },
    });

    // 2. Calcular retención (usuarios nuevos vs. activos)
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // 3. Analizar mensajes (detectar palabras clave)
    const recentMessages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        content: true,
      },
      take: 100,
    });

    const messageText = recentMessages.map((m) => m.content).join(" ").toLowerCase();
    const confusionKeywords = [
      "no sé",
      "confundido",
      "no entiendo",
      "ayuda",
      "qué hago",
      "perdido",
    ];
    const confusionCount = confusionKeywords.filter((kw) =>
      messageText.includes(kw)
    ).length;

    // 4. Check-ins
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        checkIns: true,
      },
    });

    const totalCheckIns = dailyLogs.reduce((sum, log) => sum + log.checkIns, 0);
    const avgCheckIns = dailyLogs.length ? totalCheckIns / dailyLogs.length : 0;

    // ===== ANÁLISIS CON IA =====

    const analysisPrompt = `
Analiza estos datos y genera insights accionables:

- Usuarios activos (7 días): ${activeUsers}
- Usuarios nuevos (7 días): ${newUsers}
- Check-ins promedio: ${avgCheckIns.toFixed(1)}
- Mensajes con confusión/dudas: ${confusionCount}
- Total de mensajes recientes: ${recentMessages.length}

Retención estimada: ${activeUsers > 0 ? ((activeUsers - newUsers) / activeUsers * 100).toFixed(1) : 0}%

Basándote en estos patrones, genera 2-3 insights en formato JSON:

[
  {
    "type": "retention|behavior|risk|clarity|engagement",
    "title": "Título corto (máx 60 caracteres)",
    "insight": "Interpretación clara de qué está pasando",
    "action": "Una acción específica que hacer HOY",
    "priority": "low|medium|high"
  }
]

Solo devuelve el JSON válido, sin explicaciones adicionales.
    `.trim();

    if (!process.env.OPENROUTER_API_KEY) {
      // Si no hay API key, devolver insights dummy
      const dummyInsights = [
        {
          type: "engagement",
          title: "Check-ins bajos",
          insight: `Promedio de ${avgCheckIns.toFixed(1)} check-ins por usuario. Necesitas aumentar la frecuencia de contacto.`,
          action: "Enviar recordatorio de check-in a usuarios inactivos",
          priority: "high",
        },
        {
          type: "clarity",
          title: "Usuarios confundidos",
          insight: `Se detectaron ${confusionCount} mensajes indicando confusión o dudas. Necesitan mejor onboarding.`,
          action:
            "Crear guía clara de primeros pasos o video tutorial",
          priority: "medium",
        },
      ];

      // Guardar insights en DB
      for (const insight of dummyInsights) {
        await prisma.insight.create({
          data: insight,
        });
      }

      return NextResponse.json({
        success: true,
        insights: dummyInsights,
        message: "Insights generados (sin IA, modo demo)",
      });
    }

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Eres un analista de datos enfocado en generar insights accionables para productos. Siempre devuelves JSON válido.",
            },
            {
              role: "user",
              content: analysisPrompt,
            },
          ],
        }),
      }
    );

    const aiData = await aiResponse.json();
    const aiContent = aiData?.choices?.[0]?.message?.content || "[]";

    let insights;
    try {
      insights = JSON.parse(aiContent);
      if (!Array.isArray(insights)) insights = [insights];
    } catch {
      console.error("Error parsing AI response:", aiContent);
      insights = [];
    }

    // Guardar insights en DB
    for (const insight of insights) {
      await prisma.insight.create({
        data: {
          type: insight.type || "behavior",
          title: insight.title || "Insight",
          content: insight.insight || "",
          action: insight.action || "",
          priority: insight.priority || "medium",
        },
      });
    }

    return NextResponse.json({
      success: true,
      insights,
      stats: {
        activeUsers,
        newUsers,
        avgCheckIns: avgCheckIns.toFixed(1),
        confusionCount,
      },
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
