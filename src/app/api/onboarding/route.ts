import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const FEELINGS = ["bloqueo", "ansiedad", "duda", "cansancio", "claridad", "otra"] as const;
const TIMEFRAMES = ["semana", "semanas", "meses"] as const;
const INTENTS = ["entender", "decidir", "soltar"] as const;

type Feeling = (typeof FEELINGS)[number];
type Timeframe = (typeof TIMEFRAMES)[number];
type Intent = (typeof INTENTS)[number];

export type OnboardingContext = {
  feeling: Feeling;
  feelingCustom?: string | null;
  timeframe: Timeframe;
  intent: Intent;
  completedAt: string;
};

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { onboardingCompletedAt: true, onboardingContext: true },
    });
    if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({
      completed: Boolean(user.onboardingCompletedAt),
      context: user.onboardingContext ?? null,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("ONBOARDING", error, { route: "/api/onboarding", method: "GET" });
    return NextResponse.json({ error: "ONBOARDING_LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      feeling?: string;
      feelingCustom?: string | null;
      timeframe?: string;
      intent?: string;
      skipped?: boolean;
    };

    // Skip path: el usuario eligió "Saltar y hablar ya" en /app/inicio.
    // Marcamos el onboarding como completo sin contexto. Lectores como
    // proactive-prompt y phases/context.ts ya tratan ctx sin feeling/intent
    // como ausente y caen al opening genérico.
    if (body.skipped === true) {
      const prisma = getPrismaClient();
      await prisma.user.update({
        where: { id: identity.userId },
        data: {
          onboardingContext: { skipped: true, completedAt: new Date().toISOString() },
          onboardingCompletedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, skipped: true });
    }

    const feeling = body.feeling as Feeling;
    const timeframe = body.timeframe as Timeframe;
    const intent = body.intent as Intent;

    if (!FEELINGS.includes(feeling)) {
      return NextResponse.json({ error: "FEELING_INVALID" }, { status: 400 });
    }
    if (!TIMEFRAMES.includes(timeframe)) {
      return NextResponse.json({ error: "TIMEFRAME_INVALID" }, { status: 400 });
    }
    if (!INTENTS.includes(intent)) {
      return NextResponse.json({ error: "INTENT_INVALID" }, { status: 400 });
    }

    const feelingCustom =
      feeling === "otra" && typeof body.feelingCustom === "string"
        ? body.feelingCustom.trim().slice(0, 60) || null
        : null;

    const context: OnboardingContext = {
      feeling,
      feelingCustom,
      timeframe,
      intent,
      completedAt: new Date().toISOString(),
    };

    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: identity.userId },
      data: {
        onboardingContext: context,
        onboardingCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, context });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : "Unknown";
    logError("ONBOARDING", error, { route: "/api/onboarding", method: "POST", msg });
    if (msg.includes("Unknown argument") || msg.includes("column") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "MIGRATION_PENDING", message: "Migración pendiente: onboardingContext." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "ONBOARDING_SAVE_FAILED", message: msg.slice(0, 200) }, { status: 500 });
  }
}
