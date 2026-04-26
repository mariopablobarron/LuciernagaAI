import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, resolveAdminAuth } from "@/lib/admin-auth";
import { invalidateUserDisabledCache } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function shortText(value: string, maxLength = 180): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const auth = resolveAdminAuth(req);
    audit({ actorId: auth.adminId ?? "unknown", actorType: "admin", action: "read", resource: "User", resourceId: id });
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
        telegramId: true,
        invitesEarned: true,
        firstMessageSentAt: true,
        activatedAt: true,
        onboardingCompletedAt: true,
        onboardingContext: true,
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
      enneagram,
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
      }),
      prisma.enneagramAssessment.findFirst({
        where: { userId: id },
        orderBy: { completedAt: "desc" },
        select: { id: true, dominantType: true, wing: true, scoresByType: true, testVersion: true, rawAnswers: true, completedAt: true },
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
        telegramId: user.telegramId,
        invitesEarned: user.invitesEarned,
        firstMessageSentAt: user.firstMessageSentAt?.toISOString() || null,
        activatedAt: user.activatedAt?.toISOString() || null,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() || null,
        onboardingContext: user.onboardingContext,
        counts: user._count,
      },
      state: state
        ? {
            state: state.state,
            systemState: state.systemState,
            transformationPhase: state.transformationPhase,
            mood: state.mood,
            primaryEmotion: state.primaryEmotion,
            dominantPattern: state.dominantPattern,
            focusArea: state.focusArea,
            energyLevel: state.energyLevel,
            riskLevel: state.riskLevel,
            progressTrend: state.progressTrend,
            crisisActive: state.crisisActive,
            crisisActivatedAt: state.crisisActivatedAt?.toISOString() || null,
            crisisActiveUntil: state.crisisActiveUntil?.toISOString() || null,
            dialogueIntent: state.dialogueIntent,
            dialogueStep: state.dialogueStep,
            dialogueFlow: state.dialogueFlow,
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
      enneagram: enneagram
        ? {
            id: enneagram.id,
            dominantType: enneagram.dominantType,
            wing: enneagram.wing,
            scoresByType: enneagram.scoresByType,
            testVersion: enneagram.testVersion,
            rawAnswers: enneagram.rawAnswers,
            completedAt: enneagram.completedAt.toISOString(),
          }
        : null,
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/users/[id]" });
    return NextResponse.json(
      { error: "ADMIN_USER_DETAIL_FAILED", message: "No se pudo cargar la ficha del usuario." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/admin/users/[id] — Edit user                           */
/* ------------------------------------------------------------------ */

export const PATCH = withRateLimit(
  async function PATCH(req: NextRequest, ctx: unknown) {
    try {
      const adminAuth = requireAdminPermission(req, "users:update");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const { id } = await (ctx as Params).params;
      if (!id) {
        return NextResponse.json(
          { error: "INVALID_USER_ID", message: "User id is required." },
          { status: 400 },
        );
      }

      const body = (await req.json()) as {
        name?: string;
        email?: string;
        role?: string;
        isActive?: boolean;
        restore?: boolean;
      };

      const { name, email, role, isActive, restore } = body;

      // At least one field must be provided
      if (
        name === undefined &&
        email === undefined &&
        role === undefined &&
        isActive === undefined &&
        restore === undefined
      ) {
        return NextResponse.json(
          {
            error: "NO_FIELDS",
            message: "At least one field (name, email, role, isActive, restore) is required.",
          },
          { status: 400 },
        );
      }

      // Validate email format if provided
      if (email !== undefined && !EMAIL_REGEX.test(email)) {
        return NextResponse.json(
          { error: "INVALID_EMAIL", message: "Invalid email format." },
          { status: 400 },
        );
      }

      // Validate role if provided
      if (role !== undefined && !["user", "admin"].includes(role)) {
        return NextResponse.json(
          { error: "INVALID_ROLE", message: "Role must be 'user' or 'admin'." },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();

      // Check email uniqueness if changing email
      if (email !== undefined) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== id) {
          return NextResponse.json(
            { error: "EMAIL_TAKEN", message: "That email is already in use by another user." },
            { status: 409 },
          );
        }
      }

      // Build update data — only include provided fields
      const data: Record<string, unknown> = {};
      const fields: string[] = [];
      if (name !== undefined) { data.name = name; fields.push("name"); }
      if (email !== undefined) { data.email = email; fields.push("email"); }
      if (role !== undefined) { data.role = role; fields.push("role"); }
      if (isActive !== undefined) { data.isActive = isActive; fields.push("isActive"); }
      if (restore === true) { data.deletedAt = null; data.isActive = true; fields.push("restore"); }

      const updated = await prisma.user.update({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          deletedAt: true,
          updatedAt: true,
        },
        data,
      });

      if (isActive !== undefined || restore === true) {
        invalidateUserDisabledCache(id);
      }

      logInfo("ADMIN", "user_updated", { userId: id, fields });

      return NextResponse.json({ user: updated });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "PATCH /api/admin/users/[id]" });
      return NextResponse.json(
        { error: "USER_UPDATE_FAILED", message: "No se pudo actualizar el usuario." },
        { status: 500 },
      );
    }
  },
  { limit: 30 },
);

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/users/[id] — Soft-delete (or hard with ?hard=true) */
/* ------------------------------------------------------------------ */

export const DELETE = withRateLimit(
  async function DELETE(req: NextRequest, ctx: unknown) {
    try {
      const adminAuth = requireAdminPermission(req, "users:delete");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const { id } = await (ctx as Params).params;
      if (!id) {
        return NextResponse.json(
          { error: "INVALID_USER_ID", message: "User id is required." },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();
      const url = new URL(req.url);
      // Back-compat: ?hard=true is equivalent to ?mode=hard
      const legacyHard = url.searchParams.get("hard") === "true";
      const rawMode = url.searchParams.get("mode")?.trim().toLowerCase() ?? "";
      const mode: "deactivate" | "delete" | "hard" = legacyHard
        ? "hard"
        : rawMode === "delete" || rawMode === "hard"
          ? rawMode
          : "deactivate";

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, isActive: true, deletedAt: true },
      });
      if (!user) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND", message: "No existe ese usuario." },
          { status: 404 },
        );
      }

      if (mode === "hard") {
        const confirmHeader = req.headers.get("X-Confirm-Delete");
        if (confirmHeader !== "true") {
          return NextResponse.json(
            {
              error: "CONFIRMATION_REQUIRED",
              message: "Hard delete requires the header X-Confirm-Delete: true.",
            },
            { status: 400 },
          );
        }

        await prisma.user.delete({ where: { id } });
        invalidateUserDisabledCache(id);
        logInfo("ADMIN", "user_hard_deleted", { userId: id });
        return NextResponse.json({ success: true, action: "hard_deleted", userId: id });
      }

      if (mode === "delete") {
        await prisma.user.update({
          where: { id },
          data: { deletedAt: new Date(), isActive: false },
        });
        invalidateUserDisabledCache(id);
        logInfo("ADMIN", "user_soft_deleted", { userId: id });
        return NextResponse.json({ success: true, action: "soft_deleted", userId: id });
      }

      // mode === "deactivate" — login blocked, still visible in listings
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      invalidateUserDisabledCache(id);
      logInfo("ADMIN", "user_deactivated", { userId: id });
      return NextResponse.json({ success: true, action: "deactivated", userId: id });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "DELETE /api/admin/users/[id]" });
      return NextResponse.json(
        { error: "USER_DELETE_FAILED", message: "No se pudo eliminar/desactivar el usuario." },
        { status: 500 },
      );
    }
  },
  { limit: 10 },
);
