import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import { isSyntheticEmail, normalizeEmail } from "@/services/user";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";
import { trackSafe } from "@/services/events";

type Body = {
  email?: string;
  /// Texto literal del mensaje del user que disparó la CTA (último turno).
  /// Solo usado para preview en la alerta de Telegram al equipo.
  lastMessage?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const RECENT_REQUEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof bootstrapSessionIdentity>>;
  try {
    identity = await bootstrapSessionIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ success: false, error: "INVALID_SESSION_TOKEN" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("CHAT", e, { route: "/api/team-letter/request" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const [user, latestEnneagram] = await Promise.all([
    prisma.user.findUnique({
      where: { id: identity.userId },
      select: {
        id: true,
        email: true,
        name: true,
        messageCount: true,
        onboardingContext: true,
        userState: { select: { dominantPattern: true, primaryEmotion: true } },
      },
    }),
    prisma.enneagramAssessment.findFirst({
      where: { userId: identity.userId },
      orderBy: { completedAt: "desc" },
      select: { dominantType: true, wing: true, completedAt: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
  }

  // Si user es anónimo, exigimos email; si tiene email real, usamos el suyo y
  // ignoramos el del body (evita que un anónimo capture un email ajeno).
  const userIsAnonymous = isSyntheticEmail(user.email);
  let targetEmail: string;
  if (userIsAnonymous) {
    const submitted = body.email?.trim() ?? "";
    if (!submitted || !isValidEmail(submitted)) {
      return NextResponse.json({ success: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }
    targetEmail = normalizeEmail(submitted);
  } else {
    targetEmail = normalizeEmail(user.email);
  }

  // Anti-spam: si ya hay una solicitud pending o sent en los últimos 7 días,
  // devolvemos la existente sin crear duplicado.
  const existing = await prisma.teamLetterRequest.findFirst({
    where: {
      userId: user.id,
      requestedAt: { gte: new Date(Date.now() - RECENT_REQUEST_WINDOW_MS) },
    },
    orderBy: { requestedAt: "desc" },
  });

  if (existing) {
    const res = NextResponse.json({
      success: true,
      alreadyRequested: true,
      status: existing.status,
      requestedAt: existing.requestedAt.toISOString(),
    });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  }

  // Snapshot del contexto al momento de pedirla — la conversación seguirá
  // evolucionando antes de que el equipo la lea.
  const context = {
    name: user.name ?? null,
    messageCount: user.messageCount,
    dominantPattern: user.userState?.dominantPattern ?? null,
    primaryEmotion: user.userState?.primaryEmotion ?? null,
    onboardingContext: user.onboardingContext ?? null,
    enneagram: latestEnneagram
      ? {
          dominantType: latestEnneagram.dominantType,
          wing: latestEnneagram.wing,
          completedAt: latestEnneagram.completedAt.toISOString(),
        }
      : null,
    submittedAt: new Date().toISOString(),
  };

  const created = await prisma.teamLetterRequest.create({
    data: {
      userId: user.id,
      email: targetEmail,
      status: "pending",
      context,
    },
  });

  logInfo("CHAT", "team_letter_requested", {
    userId: user.id,
    requestId: created.id,
    wasAnonymous: userIsAnonymous,
  });

  // Tracking de retención: cruzamos quién pide carta del equipo contra
  // quién vuelve en los siguientes días. Métrica clave para validar la
  // hipótesis de que la promesa humana mejora la vuelta del primer día.
  void trackSafe({
    userId: user.id,
    type: "TEAM_LETTER_REQUESTED",
    metadata: {
      requestId: created.id,
      wasAnonymous: userIsAnonymous,
      messageCount: user.messageCount,
      dominantPattern: user.userState?.dominantPattern ?? null,
      enneagramType: latestEnneagram?.dominantType ?? null,
    },
  });

  notifyAdmin(
    buildAdminAlert({
      tipo: "team_letter_request",
      userId: user.id,
      email: targetEmail,
      dominantPattern: user.userState?.dominantPattern ?? null,
      lastMessage: body.lastMessage,
    })
  );

  const res = NextResponse.json({
    success: true,
    requestId: created.id,
    status: "pending",
  });
  if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
  return res;
}
