import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

function shortText(value: string, maxLength = 180): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 }
      );

      if (adminAuth.source === "invalid") {
        clearAdminSessionCookie(unauthorized);
      }

      return unauthorized;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "INVALID_USER_ID", message: "User id is required." },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastSeen: true,
        _count: {
          select: {
            conversations: true,
            messages: true,
            goals: true,
            userChallenges: true,
            dailyLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "No existe ese usuario." },
        { status: 404 }
      );
    }

    const [
      state,
      profile,
      streak,
      subscription,
      checkins7d,
      crisis7d,
      avoidance7d,
      recentConversations,
      recentMessages,
      activeGoals,
      recentCrisisEvents,
      recentAvoidanceEvents,
      challenges,
    ] = await Promise.all([
      prisma.userState.findUnique({ where: { userId: id } }),
      prisma.userProfile.findUnique({
        where: { userId: id },
        include: {
          profile: {
            select: {
              code: true,
              type: true,
              title: true,
              description: true,
              operationalFocus: true,
            },
          },
        },
      }),
      prisma.streak.findUnique({ where: { userId: id } }),
      prisma.subscription.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.dailyCheckin.count({ where: { userId: id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.crisisEvent.count({ where: { userId: id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.avoidanceEvent.count({ where: { userId: id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.conversation.findMany({
        where: { userId: id },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              messageRecords: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.message.findMany({
        where: { userId: id },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          conversationId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.goal.findMany({
        where: { userId: id, status: "active" },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          actions: {
            select: {
              id: true,
              description: true,
              completed: true,
            },
            orderBy: { createdAt: "desc" },
            take: 15,
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.crisisEvent.findMany({
        where: { userId: id },
        select: {
          id: true,
          level: true,
          message: true,
          response: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.avoidanceEvent.findMany({
        where: { userId: id },
        include: {
          action: {
            select: {
              id: true,
              description: true,
              goal: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.userChallenge.findMany({
        where: { userId: id },
        select: {
          id: true,
          status: true,
          progress: true,
          totalDays: true,
          completedDays: true,
          startedAt: true,
          endsAt: true,
          challenge: {
            select: {
              id: true,
              title: true,
              type: true,
              difficulty: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastSeen: user.lastSeen.toISOString(),
        counts: user._count,
      },
      state: state
        ? {
            state: state.state,
            transformationPhase: state.transformationPhase,
            primaryEmotion: state.primaryEmotion,
            dominantPattern: state.dominantPattern,
            focusArea: state.focusArea,
            energyLevel: state.energyLevel,
            riskLevel: state.riskLevel,
            progressTrend: state.progressTrend,
            crisisActive: state.crisisActive,
            crisisActivatedAt: state.crisisActivatedAt?.toISOString() || null,
            crisisActiveUntil: state.crisisActiveUntil?.toISOString() || null,
            updatedAt: state.updatedAt.toISOString(),
          }
        : null,
      profile: profile
        ? {
            code: profile.profile.code,
            type: profile.profile.type,
            title: profile.profile.title,
            description: profile.profile.description,
            operationalFocus: profile.profile.operationalFocus,
            scores: {
              claridad: profile.clarityScore,
              autoestima: profile.autoestimaScore,
              energia: profile.energiaScore,
              disciplina: profile.disciplinaScore,
              social: profile.socialScore,
              total: profile.totalScore,
            },
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
      streak: streak
        ? {
            currentDays: streak.currentDays,
            bestDays: streak.bestDays,
            status: streak.status,
            lastCheckInDate: streak.lastCheckInDate?.toISOString() || null,
            updatedAt: streak.updatedAt.toISOString(),
          }
        : null,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            createdAt: subscription.createdAt.toISOString(),
          }
        : null,
      activity7d: {
        checkins: checkins7d,
        crisisEvents: crisis7d,
        avoidanceEvents: avoidance7d,
      },
      conversations: recentConversations.map((item) => ({
        id: item.id,
        title: item.title,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        messageCount: item._count.messageRecords,
      })),
      messages: recentMessages.map((item) => ({
        id: item.id,
        role: item.role,
        content: shortText(item.content, 240),
        createdAt: item.createdAt.toISOString(),
        conversationId: item.conversationId,
      })),
      activeGoals: activeGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
        totalActions: goal.actions.length,
        completedActions: goal.actions.filter((action) => action.completed).length,
        actions: goal.actions,
      })),
      crisisEvents: recentCrisisEvents.map((event) => ({
        id: event.id,
        level: event.level,
        message: shortText(event.message),
        response: shortText(event.response, 220),
        createdAt: event.createdAt.toISOString(),
      })),
      avoidanceEvents: recentAvoidanceEvents.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt.toISOString(),
        action: {
          id: event.action.id,
          description: event.action.description,
          goalId: event.action.goal?.id || null,
          goalTitle: event.action.goal?.title || null,
        },
      })),
      challenges: challenges.map((item) => ({
        id: item.id,
        status: item.status,
        progress: item.progress,
        totalDays: item.totalDays,
        completedDays: item.completedDays,
        startedAt: item.startedAt.toISOString(),
        endsAt: item.endsAt?.toISOString() || null,
        challenge: item.challenge,
      })),
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/users/[id]" });
    return NextResponse.json(
      { error: "ADMIN_USER_DETAIL_FAILED", message: "No se pudo cargar la ficha del usuario." },
      { status: 500 }
    );
  }
}
