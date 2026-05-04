import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { fetchWithTimeout } from "@/lib/utils";
import { MAIN_CHAT_MODEL as OPENROUTER_MODEL } from "@/lib/openrouter-models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_CONTEXT_CHARS = 4_000;

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bdeber[íi]as\b/i,
  /\btienes que\b/i,
  /\bdebes\b/i,
  /\bsigue as[íi]\b/i,
  /\bhaz esto\b/i,
  /\benhorabuena\b/i,
  /\bt[úu] puedes\b/i,
  /\bno te rindas\b/i,
];

export type AvatarPhase = "START" | "MIDPOINT" | "END";

export type GenerateScriptParams = {
  userId: string;
  goalId: string;
  phase: AvatarPhase;
  promptTemplate: string;
};

/**
 * Generates the spoken script for a single milestone video of a user's goal.
 * Pulls the goal title, recent user messages, and current emotional state
 * to fill the admin-editable prompt template before calling OpenRouter.
 */
export async function generateGoalAvatarScript(
  params: GenerateScriptParams,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const prisma = getPrismaClient();

  const [user, goal, state, recentMessages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, name: true, email: true },
    }),
    prisma.goal.findUnique({
      where: { id: params.goalId },
      select: { id: true, title: true, userId: true },
    }),
    prisma.userState.findUnique({
      where: { userId: params.userId },
      select: {
        state: true,
        primaryEmotion: true,
        energyLevel: true,
        transformationPhase: true,
      },
    }),
    prisma.message.findMany({
      where: { userId: params.userId, role: "user" },
      orderBy: { createdAt: "desc" },
      select: { content: true },
      take: 20,
    }),
  ]);

  if (!user) throw new Error(`User not found: ${params.userId}`);
  if (!goal) throw new Error(`Goal not found: ${params.goalId}`);
  if (goal.userId !== params.userId) {
    throw new Error(`Goal ${params.goalId} does not belong to user ${params.userId}`);
  }

  const joined = recentMessages
    .reverse()
    .map((m) => `- ${m.content.replace(/\s+/g, " ").slice(0, 260)}`)
    .join("\n");
  const recentContext = joined.slice(0, MAX_CONTEXT_CHARS) || "(sin mensajes recientes)";

  const userName = user.name?.trim() || user.email.split("@")[0] || "amigo";
  const currentState = state
    ? `${state.state} · ${state.primaryEmotion} · energía ${state.energyLevel} · fase ${state.transformationPhase}`
    : "estado desconocido";

  const systemPrompt = params.promptTemplate
    .replace(/\{userName\}/g, userName)
    .replace(/\{goalTitle\}/g, goal.title)
    .replace(/\{recentContext\}/g, recentContext)
    .replace(/\{currentState\}/g, currentState);

  const res = await fetchWithTimeout(
    OPENROUTER_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": `mentor-web-avatar-${params.phase.toLowerCase()}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Genera el guión hablado para ${userName}. Máximo 50 palabras. Solo el guión, sin comillas.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 220,
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter script generation failed: HTTP ${res.status} — ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) throw new Error("OpenRouter returned an empty script");

  const script = raw.replace(/^["'`]+|["'`]+$/g, "").trim();

  const violations = FORBIDDEN_PATTERNS.filter((re) => re.test(script));
  if (violations.length > 0) {
    logError(
      "AVATAR_SCRIPT",
      new Error("script_contains_forbidden_patterns"),
      {
        userId: params.userId,
        goalId: params.goalId,
        phase: params.phase,
        patterns: violations.map((re) => re.source),
        script: script.slice(0, 300),
      },
    );
  }

  logInfo("AVATAR_SCRIPT", "script_generated", {
    userId: params.userId,
    goalId: params.goalId,
    phase: params.phase,
    wordCount: script.split(/\s+/).filter(Boolean).length,
    hasViolations: violations.length > 0,
  });

  return script;
}
