import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";

const VALID_TONES = ["directo", "socratico", "calido"] as const;

// GET /api/user/preferences
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: identity.userId },
    select: { aiTone: true, reminderTime: true },
  });

  return NextResponse.json({ preferences: prefs ?? { aiTone: "directo", reminderTime: null } });
}

// PATCH /api/user/preferences
export async function PATCH(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const body = (await req.json().catch(() => null)) as {
    aiTone?: string;
    reminderTime?: string | null;
  } | null;

  if (!body) return NextResponse.json({ error: "Body requerido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.aiTone && VALID_TONES.includes(body.aiTone as typeof VALID_TONES[number]))
    data.aiTone = body.aiTone;
  if ("reminderTime" in body)
    data.reminderTime = body.reminderTime ?? null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const prisma = getPrismaClient();
  const prefs = await prisma.userPreferences.upsert({
    where: { userId: identity.userId },
    create: { userId: identity.userId, ...data },
    update: data,
    select: { aiTone: true, reminderTime: true },
  });

  return NextResponse.json({ preferences: prefs });
}
