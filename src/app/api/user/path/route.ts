import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity, InvalidSessionTokenError, clearSessionCookie } from "@/lib/auth";
import { logError } from "@/lib/logger";

export type PathMilestone = {
  id: string;
  label: string;
  at: string;
};

export type PathResponse = {
  arrivedAt: string;
  milestones: PathMilestone[];
};

// GET /api/user/path — hitos del journey cruzados, en orden cronológico.
// Sin números, sin metas, sin "siguiente nivel". Espejo, no marcador.
export async function GET(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;

  try {
    identity = await resolveIdentity(req, { allowAnonymousBootstrap: true });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("PATH", e, { route: "/api/user/path" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  try {
    const prisma = getPrismaClient();

    const [user, firstTeamLetter, firstCircleMember, firstClosingLetter] = await Promise.all([
      prisma.user.findUnique({
        where: { id: identity.userId },
        select: { createdAt: true, firstMessageSentAt: true },
      }),
      prisma.teamLetterRequest.findFirst({
        where: { userId: identity.userId },
        orderBy: { requestedAt: "asc" },
        select: { requestedAt: true },
      }),
      prisma.circleMember.findFirst({
        where: { userId: identity.userId },
        orderBy: { joinedAt: "asc" },
        select: { joinedAt: true },
      }),
      prisma.circleClosingLetter.findFirst({
        where: { userId: identity.userId },
        orderBy: { generatedAt: "asc" },
        select: { generatedAt: true },
      }),
    ]);

    const arrivedAt = user?.createdAt ?? new Date();
    const milestones: PathMilestone[] = [];

    milestones.push({
      id: "arrived",
      label: "Llegaste",
      at: arrivedAt.toISOString(),
    });

    if (user?.firstMessageSentAt) {
      milestones.push({
        id: "first-message",
        label: "Empezaste a contarnos",
        at: user.firstMessageSentAt.toISOString(),
      });
    }

    if (firstTeamLetter?.requestedAt) {
      milestones.push({
        id: "team-letter",
        label: "Pediste una carta del equipo",
        at: firstTeamLetter.requestedAt.toISOString(),
      });
    }

    if (firstCircleMember?.joinedAt) {
      milestones.push({
        id: "circle-joined",
        label: "Entraste a un círculo",
        at: firstCircleMember.joinedAt.toISOString(),
      });
    }

    if (firstClosingLetter?.generatedAt) {
      milestones.push({
        id: "circle-closed",
        label: "Cerraste un ciclo",
        at: firstClosingLetter.generatedAt.toISOString(),
      });
    }

    milestones.sort((a, b) => a.at.localeCompare(b.at));

    const body: PathResponse = {
      arrivedAt: arrivedAt.toISOString(),
      milestones,
    };

    return NextResponse.json(body);
  } catch (error: unknown) {
    logError("PATH", error, { route: "/api/user/path", userId: identity.userId });
    return NextResponse.json({ error: "No se pudo cargar el camino" }, { status: 500 });
  }
}
