import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDecision, type Metrics } from "@/lib/decisions";

export async function GET() {
  try {
    // Contar usuarios totales y activos
    const totalUsers = await prisma.user.count();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        lastSeen: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Análisis de retención por día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day1 = new Date(today);
    day1.setDate(day1.getDate() - 1);

    const day2 = new Date(today);
    day2.setDate(day2.getDate() - 2);

    const day3 = new Date(today);
    day3.setDate(day3.getDate() - 3);

    const day7 = new Date(today);
    day7.setDate(day7.getDate() - 7);

    const usersDay1 = await prisma.user.count({
      where: {
        createdAt: {
          gte: day1,
          lt: new Date(day1.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const usersDay3Active = await prisma.dailyCheckin.findMany({
      where: {
        createdAt: {
          gte: day3,
        },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const retentionDay3 = usersDay1 > 0 ? usersDay3Active.length / usersDay1 : 0;
    const retentionDay7 = usersDay1 > 0 ? (activeUsers / usersDay1) * 0.8 : 0;

    // Check-in drop
    const lastWeekCheckins = await prisma.dailyCheckin.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const expectedCheckins = activeUsers * 7;
    const checkinDrop =
      expectedCheckins > 0 ? 1 - lastWeekCheckins / expectedCheckins : 0;

    // Estado dominante
    const userStates = await prisma.userState.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { state: true },
    });

    const stateCount: { [key: string]: number } = {};
    userStates.forEach((us) => {
      stateCount[us.state] = (stateCount[us.state] || 0) + 1;
    });

    const dominantState = Object.keys(stateCount).length
      ? Object.entries(stateCount).sort((a, b) => b[1] - a[1])[0][0]
      : "unknown";

    // Mensajes confusión
    const messages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: { content: true },
      take: 100,
    });

    const confusionMessages = messages.filter(
      (m) =>
        m.content.toLowerCase().includes("no sé") ||
        m.content.toLowerCase().includes("confund")
    ).length;

    // Determinar punto de abandono
    let dropOffPoint = "day_1";
    if (usersDay1 > 0) {
      const day2Users = await prisma.dailyCheckin.count({
        where: {
          createdAt: {
            gte: day2,
            lt: new Date(day2.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (day2Users < usersDay1 * 0.5) {
        dropOffPoint = "day_2";
      } else if (usersDay3Active.length < usersDay1 * 0.3) {
        dropOffPoint = "day_3";
      }
    }

    const metrics: Metrics = {
      retentionDay3,
      retentionDay7,
      dropOffPoint,
      checkinDrop,
      dominantState,
      totalUsers,
      activeUsers,
    };

    // Generar decisión
    const decision = generateDecision(metrics);

    // Guardar en DB
    await prisma.decisionLog.create({
      data: {
        metric: decision.metric,
        value: decision.value,
        decision: decision.decision,
      },
    });

    // Generar insights basados en métricas
    const insights = [];

    if (retentionDay3 < 0.4) {
      insights.push({
        type: "retention",
        title: "Retención baja en día 3",
        content: `Solo ${(retentionDay3 * 100).toFixed(0)}% de usuarios vuelven en día 3`,
        action: "Simplificar onboarding",
      });
    }

    if (checkinDrop > 0.5) {
      insights.push({
        type: "engagement",
        title: "Abandono de check-ins",
        content: `${(checkinDrop * 100).toFixed(0)}% de abandono en check-ins diarios`,
        action: "Reducir tiempo de check-in a 2 minutos",
      });
    }

    if (dominantState === "bloqueado") {
      insights.push({
        type: "clarity",
        title: "Mayoría de usuarios bloqueados",
        content: `${stateCount["bloqueado"] || 0} usuarios reportan parálisis o bloqueo`,
        action: "Ofrecer acciones micro-ejecutables",
      });
    }

    if (confusionMessages > 5) {
      insights.push({
        type: "clarity",
        title: "Alta confusión detectada",
        content: `${confusionMessages} mensajes expresan confusión`,
        action: "Mejorar explicaciones y preguntas clave",
      });
    }

    return NextResponse.json({
      ok: true,
      metrics,
      decision,
      insights,
      stats: {
        totalUsers,
        activeUsers,
        retentionDay3: (retentionDay3 * 100).toFixed(1) + "%",
        retentionDay7: (retentionDay7 * 100).toFixed(1) + "%",
        dropOffPoint,
        checkinDrop: (checkinDrop * 100).toFixed(1) + "%",
        dominantState,
        confusionMessages,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error generating insights" },
      { status: 500 }
    );
  }
}
