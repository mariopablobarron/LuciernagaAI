import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { getOpenRouterChatUrl, getOpenRouterHeaders } from "@/lib/openrouter";

interface GeneratedChallenge {
  title: string;
  type: "ejecucion" | "claridad" | "disciplina" | "energia" | "social";
  description: string;
  instructions: string;
  successMetric: string;
  durationDays: number;
  estimatedMinutes: number;
  difficulty: number;
}

async function callAIForChallenge(recentMessages: string): Promise<GeneratedChallenge | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const prompt = `Eres un coach de transformación personal. Basándote en los mensajes del usuario, genera un reto personalizado de 7 días.

Mensajes recientes:
${recentMessages}

Responde SOLO con JSON válido, sin texto adicional:
{
  "title": "Título concreto del reto (máx 60 chars)",
  "type": "ejecucion|claridad|disciplina|energia|social",
  "description": "Descripción breve (máx 120 chars)",
  "instructions": "Qué hacer exactamente cada día (máx 280 chars)",
  "successMetric": "Cómo saber que lo logró hoy (máx 100 chars)",
  "durationDays": 7,
  "estimatedMinutes": 15,
  "difficulty": 1
}

Reglas:
- El reto debe ser específico para los temas de sus mensajes
- Accionable en 15 minutos al día
- Concreto, no genérico`;

  try {
    const res = await fetch(getOpenRouterChatUrl(), {
      method: "POST",
      headers: {
        ...getOpenRouterHeaders(apiKey, { feature: "personalized_challenge" }),
        "HTTP-Referer": process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as GeneratedChallenge;
  } catch (err: unknown) {
    logError("RETO", err, { area: "callAIForChallenge" });
    return null;
  }
}

export async function generatePersonalizedChallenge(userId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  // Don't generate if already has an active challenge
  const existing = await prisma.userChallenge.findFirst({
    where: { userId, status: "active" },
  });
  if (existing) return false;

  // Get recent user messages for context
  const messages = await prisma.message.findMany({
    where: { userId, role: "user" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true },
  });

  if (messages.length < 2) return false;

  const recentMessages = messages
    .reverse()
    .slice(-20)
    .map((m) => `- ${m.content.slice(0, 200)}`)
    .join("\n");

  const generated = await callAIForChallenge(recentMessages);
  if (!generated) return false;

  // Validate required fields
  if (!generated.title || !generated.instructions || !generated.successMetric) return false;

  const slug = `ai-${userId.slice(0, 8)}-${Date.now()}`;

  const challenge = await prisma.challenge.create({
    data: {
      slug,
      type: generated.type ?? "claridad",
      title: generated.title.slice(0, 100),
      description: (generated.description ?? "").slice(0, 200),
      difficulty: Math.max(1, Math.min(3, Math.round(generated.difficulty ?? 1))),
      durationDays: generated.durationDays ?? 7,
      estimatedMinutes: generated.estimatedMinutes ?? 15,
      instructions: generated.instructions.slice(0, 500),
      successMetric: generated.successMetric.slice(0, 200),
    },
  });

  await prisma.userChallenge.create({
    data: {
      userId,
      challengeId: challenge.id,
      totalDays: challenge.durationDays,
      endsAt: new Date(Date.now() + challenge.durationDays * 24 * 60 * 60 * 1000),
    },
  });

  logInfo("RETO", "personalized_challenge_generated", {
    userId,
    slug,
    title: generated.title,
  });

  return true;
}
