import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { closeCircleAndGenerateLetters, type CloseReason } from "@/services/circleMatchmaking";
import { openWeeklyPulseForCircle } from "@/services/circlePulses";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/community/circles/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();

    const circle = await prisma.circle.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                userState: { select: { dominantPattern: true, primaryEmotion: true, updatedAt: true } },
              },
            },
          },
        },
        pulses: {
          orderBy: { weekStart: "desc" },
          take: 12,
          include: {
            responses: {
              select: { id: true, userId: true, content: true, submittedAt: true, flagged: true },
              orderBy: { submittedAt: "asc" },
            },
            reflections: {
              select: {
                id: true,
                userId: true,
                content: true,
                source: true,
                generatedAt: true,
                approvedAt: true,
                publishedAt: true,
              },
            },
          },
        },
        closingLetters: { select: { id: true, userId: true, reason: true, generatedAt: true } },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        matchPattern: circle.matchPattern,
        matchEmotion: circle.matchEmotion,
        maxMembers: circle.maxMembers,
        isActive: circle.isActive,
        startsAt: circle.startsAt.toISOString(),
        cycleEndsAt: circle.cycleEndsAt?.toISOString() ?? null,
        createdAt: circle.createdAt.toISOString(),
        members: circle.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          leftAt: m.leftAt?.toISOString() ?? null,
          state: m.user.userState
            ? {
                dominantPattern: m.user.userState.dominantPattern,
                primaryEmotion: m.user.userState.primaryEmotion,
                drifted:
                  m.user.userState.dominantPattern !== circle.matchPattern ||
                  m.user.userState.primaryEmotion !== circle.matchEmotion,
                updatedAt: m.user.userState.updatedAt.toISOString(),
              }
            : null,
        })),
        pulses: circle.pulses.map((p) => ({
          id: p.id,
          prompt: p.prompt,
          promptSource: p.promptSource,
          status: p.status,
          weekStart: p.weekStart.toISOString(),
          weekEnd: p.weekEnd.toISOString(),
          openedAt: p.openedAt.toISOString(),
          closedAt: p.closedAt?.toISOString() ?? null,
          responses: p.responses.map((r) => ({
            id: r.id,
            userId: r.userId,
            content: r.content,
            flagged: r.flagged,
            submittedAt: r.submittedAt.toISOString(),
          })),
          reflections: p.reflections.map((r) => ({
            id: r.id,
            userId: r.userId,
            content: r.content,
            source: r.source,
            generatedAt: r.generatedAt.toISOString(),
            approvedAt: r.approvedAt?.toISOString() ?? null,
            publishedAt: r.publishedAt?.toISOString() ?? null,
          })),
        })),
        closingLetters: circle.closingLetters.map((l) => ({
          id: l.id,
          userId: l.userId,
          reason: l.reason,
          generatedAt: l.generatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logError("ADMIN_CIRCLES", error, { route: "/api/admin/community/circles/[id]" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

// POST /api/admin/community/circles/[id]  { action: "close" | "force-pulse", reason?: CloseReason }
export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { action?: string; reason?: CloseReason } | null;

    if (body?.action === "close") {
      const reason: CloseReason = body.reason ?? "removed";
      const result = await closeCircleAndGenerateLetters(id, reason);
      logInfo("ADMIN_CIRCLES", "circle_closed_manual", { circleId: id, reason, lettersCreated: result.lettersCreated });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body?.action === "force-pulse") {
      const result = await openWeeklyPulseForCircle(id);
      logInfo("ADMIN_CIRCLES", "pulse_forced", { circleId: id, ...result });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch (error) {
    logError("ADMIN_CIRCLES", error, { route: "/api/admin/community/circles/[id]", method: "POST" });
    return NextResponse.json({ error: "ACTION_FAILED" }, { status: 500 });
  }
}
