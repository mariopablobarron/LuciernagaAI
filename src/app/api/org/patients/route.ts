import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { verifyOrgToken } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/org/patients?orgId=...&token=...
 *
 * Therapist portal — shows patients assigned to this organization.
 * Only available for orgAdmins with role "therapist".
 * Shows clinical summary per patient (not chat content).
 */
export const GET = withRateLimit(async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  const token = req.nextUrl.searchParams.get("token");

  if (!orgId || !token) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Verify signed token and extract admin ID
  const verified = verifyOrgToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  try {
    // Verify therapist access using the admin ID from the signed token
    const admin = await prisma.orgAdmin.findFirst({
      where: { organizationId: orgId, id: verified.adminId, role: "therapist" },
      select: { id: true, name: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized — therapist role required" }, { status: 401 });
    }

    // Get patients with clinical summary (no chat content)
    const patients = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastSeen: true,
        messageCount: true,
        userState: {
          select: {
            state: true,
            primaryEmotion: true,
            dominantPattern: true,
            riskLevel: true,
            progressTrend: true,
            crisisActive: true,
            transformationPhase: true,
          },
        },
        streak: { select: { currentDays: true, bestDays: true } },
        goals: {
          where: { status: "active" },
          select: { title: true, actions: { select: { completed: true } } },
          take: 1,
        },
        avoidanceEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { type: true, createdAt: true },
        },
      },
      orderBy: { lastSeen: "desc" },
    });

    // Build clinical summaries (anonymize email, only show first name)
    const summaries = patients.map((p) => {
      const daysSinceActive = Math.floor(
        (Date.now() - p.lastSeen.getTime()) / (24 * 60 * 60 * 1000)
      );

      let riskFlag: "green" | "yellow" | "red" = "green";
      if (p.userState?.crisisActive) riskFlag = "red";
      else if (p.userState?.riskLevel === "medium" || p.userState?.riskLevel === "high") riskFlag = "yellow";
      else if (daysSinceActive >= 3) riskFlag = "yellow";

      return {
        id: p.id,
        displayName: p.name ?? `Paciente ${p.id.slice(-4)}`,
        riskFlag,
        daysSinceActive,
        messageCount: p.messageCount,
        state: p.userState?.state ?? "neutral",
        primaryEmotion: p.userState?.primaryEmotion ?? "calma",
        dominantPattern: p.userState?.dominantPattern ?? "—",
        progressTrend: p.userState?.progressTrend ?? "igual",
        transformationPhase: p.userState?.transformationPhase ?? "exploración",
        riskLevel: p.userState?.riskLevel ?? "low",
        crisisActive: p.userState?.crisisActive ?? false,
        streakDays: p.streak?.currentDays ?? 0,
        bestStreak: p.streak?.bestDays ?? 0,
        activeGoal: p.goals[0]?.title ?? null,
        goalProgress: p.goals[0]
          ? Math.round((p.goals[0].actions.filter((a) => a.completed).length / Math.max(p.goals[0].actions.length, 1)) * 100)
          : 0,
        lastAvoidance: p.avoidanceEvents[0]
          ? { type: p.avoidanceEvents[0].type, daysAgo: Math.floor((Date.now() - p.avoidanceEvents[0].createdAt.getTime()) / (24 * 60 * 60 * 1000)) }
          : null,
        joinedAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      therapist: admin.name,
      patientCount: summaries.length,
      patients: summaries,
    });
  } catch (error) {
    logError("ORG", error, { action: "patients_fetch", orgId });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}, { limit: 30 });
