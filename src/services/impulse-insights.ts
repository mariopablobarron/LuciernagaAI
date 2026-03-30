import { getPrismaClient } from "@/db/prisma";
import { listRecentUserMessagesForUser } from "@/services/conversation";
import { listRecentImpulseLogs } from "@/services/impulse-challenges";
import type { ImpulseInsight } from "@/types/impulse";

function daysBetween(left: Date, right: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startLeft = new Date(left);
  const startRight = new Date(right);
  startLeft.setHours(0, 0, 0, 0);
  startRight.setHours(0, 0, 0, 0);
  return Math.round((startLeft.getTime() - startRight.getTime()) / msPerDay);
}

function countOccurrences(messages: string[], fragments: string[]): number {
  return messages.reduce((total, message) => {
    const normalized = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const matched = fragments.some((fragment) => normalized.includes(fragment));
    return total + (matched ? 1 : 0);
  }, 0);
}

export async function getImpulseInsightsForUser(userId: string): Promise<ImpulseInsight[]> {
  const prisma = getPrismaClient();
  const [messages, logs, activeChallenges] = await Promise.all([
    listRecentUserMessagesForUser(userId, 12),
    listRecentImpulseLogs(userId, 7),
    prisma.userChallenge.findMany({
      where: {
        userId,
        status: "active",
      },
      include: {
        challenge: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        startedAt: "asc",
      },
      take: 5,
    }),
  ]);

  const insights: ImpulseInsight[] = [];
  const repeatedNoSe = countOccurrences(messages, ["no se", "no tengo claro", "estoy perdido"]);
  if (repeatedNoSe >= 2) {
    insights.push({
      type: "behavior",
      title: "Estás repitiendo falta de dirección",
      action:
        "Reduce tu foco a una sola decisión y conviértela hoy en una acción de menos de 15 minutos.",
      evidence: messages.slice(-3),
    });
  }

  const lowEnergyLogs = logs.filter((log) => {
    const emotionalState = (log.emotionalState || "").toLowerCase();
    return emotionalState === "bloqueo" || emotionalState === "ansiedad" || (log.momentum ?? 3) <= 2;
  });

  if (lowEnergyLogs.length >= 2) {
    insights.push({
      type: "behavior",
      title: "Tu energía viene baja y sostenida",
      action:
        "No subas la exigencia. Recorta tu reto activo a una versión más pequeña y protégela a primera hora.",
      evidence: lowEnergyLogs.slice(0, 3).map((log) => log.note || log.emotionalState || "Sin nota"),
    });
  }

  const latestLogDate = logs[0]?.createdAt ? new Date(logs[0].createdAt) : null;
  if (!latestLogDate || daysBetween(new Date(), latestLogDate) >= 2) {
    insights.push({
      type: "behavior",
      title: "Hay señal de abandono reciente",
      action:
        "No retomes con una conversación larga. Vuelve con un check-in honesto y una sola acción concreta hoy.",
      evidence: latestLogDate ? [`Último check-in: ${latestLogDate.toISOString()}`] : ["Sin check-ins recientes"],
    });
  }

  const stagnatedChallenge = activeChallenges.find((challenge) => {
    const ageInDays = daysBetween(new Date(), challenge.startedAt);
    return challenge.progress <= 20 && ageInDays >= 2;
  });

  if (stagnatedChallenge) {
    insights.push({
      type: "behavior",
      title: "Un reto activo está estancado",
      action: `Recorta o redefine hoy el reto "${stagnatedChallenge.challenge.title}" antes de acumular más fricción.`,
      evidence: [
        `${stagnatedChallenge.challenge.title}: ${stagnatedChallenge.progress}%`,
        `Días completados: ${stagnatedChallenge.completedDays}/${stagnatedChallenge.totalDays}`,
      ],
    });
  }

  return insights.slice(0, 4);
}
