import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";

const VALID_TONES = ["directo", "socratico", "calido"] as const;
const VALID_TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "America/Los_Angeles",
] as const;

const PREFERENCES_SELECT = {
  aiTone: true,
  reminderTime: true,
  reminderEnabled: true,
  weeklyEmailEnabled: true,
  notifyInsights: true,
  notifyGoals: true,
  notifyUpdates: true,
  timezone: true,
} as const;

const DEFAULT_PREFERENCES = {
  aiTone: "directo",
  reminderTime: null,
  reminderEnabled: true,
  weeklyEmailEnabled: true,
  notifyInsights: true,
  notifyGoals: true,
  notifyUpdates: false,
  timezone: "Europe/Madrid",
};

// GET /api/user/preferences
export async function GET(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  const prisma = getPrismaClient();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: identity.userId },
    select: PREFERENCES_SELECT,
  });

  return NextResponse.json({ preferences: prefs ?? DEFAULT_PREFERENCES });
}

// PATCH /api/user/preferences
export async function PATCH(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body requerido" }, { status: 400 });

  const data: Record<string, unknown> = {};

  // String fields with validation
  if (body.aiTone && VALID_TONES.includes(body.aiTone as typeof VALID_TONES[number]))
    data.aiTone = body.aiTone;
  if (body.timezone && VALID_TIMEZONES.includes(body.timezone as typeof VALID_TIMEZONES[number]))
    data.timezone = body.timezone;
  if ("reminderTime" in body) {
    const rt = body.reminderTime;
    data.reminderTime = typeof rt === "string" && /^\d{2}:\d{2}$/.test(rt) ? rt : null;
  }

  // Boolean fields
  for (const key of ["reminderEnabled", "weeklyEmailEnabled", "notifyInsights", "notifyGoals", "notifyUpdates"] as const) {
    if (key in body && typeof body[key] === "boolean") data[key] = body[key];
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const prisma = getPrismaClient();
  const prefs = await prisma.userPreferences.upsert({
    where: { userId: identity.userId },
    create: { userId: identity.userId, ...data },
    update: data,
    select: PREFERENCES_SELECT,
  });

  return NextResponse.json({ preferences: prefs });
}
