import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:avatar_videos";

const DEFAULT_PROMPT_START = `Eres Luciérnaga, un mentor cálido y lúcido.

{userName} acaba de comprometerse con un objetivo:
"{goalTitle}"

Contexto reciente de sus últimas conversaciones:
{recentContext}

Genera un guión hablado de máximo 50 palabras (≈20 segundos) para marcar este umbral.

Reglas absolutas:
- NO celebres. NO digas "qué bien", "me alegra", "enhorabuena". El umbral no se celebra, se reconoce.
- NO des consejos ni pasos a seguir.
- Reconoce brevemente que ha tomado una decisión real.
- Ancla el porqué — qué está detrás de este objetivo.
- Termina con UNA pregunta honesta sobre lo que esto cambia desde hoy.
- Tono: cercano, directo, sin azúcar.
- Máximo 50 palabras. Solo el guión, sin comillas.`;

const DEFAULT_PROMPT_MIDPOINT = `Eres Luciérnaga, un mentor cálido y lúcido.

{userName} está en un momento difícil con su objetivo activo:
"{goalTitle}"

Su estado emocional actual: {currentState}
Contexto reciente:
{recentContext}

Genera un guión hablado de máximo 50 palabras para acompañarle en la prueba.

Reglas absolutas:
- NO animes. NO digas "tú puedes", "no te rindas".
- NO valides rápido ("qué valiente por intentarlo").
- Reconoce la dificultad con precisión, sin dramatizar.
- PROHIBIDO dar consejos.
- Termina con UNA pregunta que le obligue a revisar si el objetivo sigue siendo suyo.
- Tono: presente, cercano, sin prisa.
- Máximo 50 palabras. Solo el guión, sin comillas.`;

const DEFAULT_PROMPT_END = `Eres Luciérnaga, un mentor cálido y lúcido.

{userName} acaba de completar su objetivo:
"{goalTitle}"

Contexto reciente:
{recentContext}

Genera un guión hablado de máximo 50 palabras para marcar el retorno.

Reglas absolutas:
- NO felicites rápido. NO digas "enhorabuena", "lo lograste".
- Señala con precisión algo concreto que cambió en él.
- No le empujes al siguiente objetivo.
- Termina con UNA pregunta sobre quién es ahora que lo tiene.
- Tono: reposado, honesto, casi grave.
- Máximo 50 palabras. Solo el guión, sin comillas.`;

async function getOrCreateConfig() {
  const prisma = getPrismaClient();
  const existing = await prisma.avatarVideoConfig.findUnique({
    where: { id: "singleton" },
  });
  if (existing) return existing;
  return prisma.avatarVideoConfig.create({
    data: {
      id: "singleton",
      promptTemplateStart: DEFAULT_PROMPT_START,
      promptTemplateMidpoint: DEFAULT_PROMPT_MIDPOINT,
      promptTemplateEnd: DEFAULT_PROMPT_END,
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const config = await getOrCreateConfig();
    return NextResponse.json({ config });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "config_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

type UpdatePayload = {
  enabled?: boolean;
  maxVideosPerDay?: number;
  midpointMinDays?: number;
  maxBroadcastsPerMonth?: number;
  broadcastUserCooldownDays?: number;
  tone?: string;
  avatarId?: string;
  promptTemplateStart?: string;
  promptTemplateMidpoint?: string;
  promptTemplateEnd?: string;
};

export async function PUT(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as UpdatePayload;

    if (
      body.maxVideosPerDay !== undefined &&
      (!Number.isInteger(body.maxVideosPerDay) ||
        body.maxVideosPerDay < 0 ||
        body.maxVideosPerDay > 1000)
    ) {
      return NextResponse.json(
        { error: "maxVideosPerDay must be 0-1000" },
        { status: 400 },
      );
    }
    if (
      body.midpointMinDays !== undefined &&
      (!Number.isInteger(body.midpointMinDays) ||
        body.midpointMinDays < 0 ||
        body.midpointMinDays > 90)
    ) {
      return NextResponse.json(
        { error: "midpointMinDays must be 0-90" },
        { status: 400 },
      );
    }
    if (
      body.maxBroadcastsPerMonth !== undefined &&
      (!Number.isInteger(body.maxBroadcastsPerMonth) ||
        body.maxBroadcastsPerMonth < 0 ||
        body.maxBroadcastsPerMonth > 100)
    ) {
      return NextResponse.json(
        { error: "maxBroadcastsPerMonth must be 0-100" },
        { status: 400 },
      );
    }
    if (
      body.broadcastUserCooldownDays !== undefined &&
      (!Number.isInteger(body.broadcastUserCooldownDays) ||
        body.broadcastUserCooldownDays < 0 ||
        body.broadcastUserCooldownDays > 90)
    ) {
      return NextResponse.json(
        { error: "broadcastUserCooldownDays must be 0-90" },
        { status: 400 },
      );
    }
    if (body.tone !== undefined && !["interpellation", "motivation", "mixed"].includes(body.tone)) {
      return NextResponse.json({ error: "invalid tone" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    await getOrCreateConfig();
    const config = await prisma.avatarVideoConfig.update({
      where: { id: "singleton" },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.maxVideosPerDay !== undefined
          ? { maxVideosPerDay: body.maxVideosPerDay }
          : {}),
        ...(body.midpointMinDays !== undefined
          ? { midpointMinDays: body.midpointMinDays }
          : {}),
        ...(body.maxBroadcastsPerMonth !== undefined
          ? { maxBroadcastsPerMonth: body.maxBroadcastsPerMonth }
          : {}),
        ...(body.broadcastUserCooldownDays !== undefined
          ? { broadcastUserCooldownDays: body.broadcastUserCooldownDays }
          : {}),
        ...(body.tone !== undefined ? { tone: body.tone } : {}),
        ...(body.avatarId !== undefined ? { avatarId: body.avatarId.trim() } : {}),
        ...(body.promptTemplateStart !== undefined
          ? { promptTemplateStart: body.promptTemplateStart }
          : {}),
        ...(body.promptTemplateMidpoint !== undefined
          ? { promptTemplateMidpoint: body.promptTemplateMidpoint }
          : {}),
        ...(body.promptTemplateEnd !== undefined
          ? { promptTemplateEnd: body.promptTemplateEnd }
          : {}),
        updatedBy: auth.adminName ?? auth.adminId ?? "unknown",
      },
    });

    return NextResponse.json({ config });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "config_PUT" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
