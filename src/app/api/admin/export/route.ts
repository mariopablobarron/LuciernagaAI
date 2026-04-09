import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logInfo } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/export?type=users|conversations|events|crisis|avoidance|full&format=json|csv&anonymize=true
 * Exports data for research purposes.
 */
export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "users:export-pdf");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const prisma = getPrismaClient();
  const type = req.nextUrl.searchParams.get("type") ?? "users";
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const anonymize = req.nextUrl.searchParams.get("anonymize") === "true";

  function anonId(id: string | null): string {
    if (!id) return "unknown";
    return anonymize ? `user_${id.slice(0, 6)}` : id;
  }
  function anonEmail(email: string): string {
    if (!anonymize) return email;
    const [, domain] = email.split("@");
    return `***@${domain ?? "***"}`;
  }

  let data: unknown;
  let filename: string;

  switch (type) {
    case "users": {
      const users = await prisma.user.findMany({
        select: {
          id: true, email: true, name: true, role: true, createdAt: true, lastSeen: true, isActive: true, messageCount: true,
          userState: { select: { state: true, systemState: true, transformationPhase: true, primaryEmotion: true, dominantPattern: true, focusArea: true, energyLevel: true, riskLevel: true, progressTrend: true, crisisActive: true } },
          streak: { select: { currentDays: true, bestDays: true } },
          subscriptions: { select: { plan: true, status: true }, take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      data = users.map((u) => ({
        id: anonId(u.id),
        email: anonEmail(u.email),
        name: anonymize ? "***" : u.name,
        role: u.role,
        createdAt: u.createdAt,
        lastSeen: u.lastSeen,
        isActive: u.isActive,
        messageCount: u.messageCount,
        state: u.userState?.state ?? null,
        systemState: u.userState?.systemState ?? null,
        transformationPhase: u.userState?.transformationPhase ?? null,
        primaryEmotion: u.userState?.primaryEmotion ?? null,
        dominantPattern: u.userState?.dominantPattern ?? null,
        focusArea: u.userState?.focusArea ?? null,
        energyLevel: u.userState?.energyLevel ?? null,
        riskLevel: u.userState?.riskLevel ?? null,
        progressTrend: u.userState?.progressTrend ?? null,
        crisisActive: u.userState?.crisisActive ?? false,
        streakCurrent: u.streak?.currentDays ?? 0,
        streakBest: u.streak?.bestDays ?? 0,
        plan: u.subscriptions[0]?.plan ?? "free",
        subscriptionStatus: u.subscriptions[0]?.status ?? "none",
      }));
      filename = "users-export";
      break;
    }

    case "conversations": {
      const conversations = await prisma.conversation.findMany({
        select: {
          id: true, userId: true, title: true, createdAt: true, updatedAt: true,
          _count: { select: { messageRecords: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      data = conversations.map((c) => ({
        id: c.id,
        userId: anonId(c.userId),
        title: anonymize ? `conv_${c.id.slice(0, 6)}` : c.title,
        messageCount: c._count.messageRecords,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
      filename = "conversations-export";
      break;
    }

    case "events": {
      const events = await prisma.event.findMany({
        select: { id: true, userId: true, type: true, metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      data = events.map((e) => ({
        id: e.id,
        userId: anonId(e.userId),
        type: e.type,
        metadata: e.metadata,
        createdAt: e.createdAt,
      }));
      filename = "events-export";
      break;
    }

    case "crisis": {
      const crisis = await prisma.crisisEvent.findMany({
        select: { id: true, userId: true, level: true, message: true, response: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      data = crisis.map((c) => ({
        id: c.id,
        userId: anonId(c.userId),
        level: c.level,
        message: anonymize ? "[REDACTED]" : c.message,
        response: c.response,
        createdAt: c.createdAt,
      }));
      filename = "crisis-export";
      break;
    }

    case "avoidance": {
      const avoidance = await prisma.avoidanceEvent.findMany({
        select: {
          id: true, userId: true, actionId: true, type: true, createdAt: true,
          action: { select: { description: true, goal: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      data = avoidance.map((a) => ({
        id: a.id,
        userId: anonId(a.userId),
        type: a.type,
        actionDescription: a.action.description,
        goalTitle: a.action.goal?.title ?? null,
        createdAt: a.createdAt,
      }));
      filename = "avoidance-export";
      break;
    }

    case "snapshot": {
      // Manual snapshot of current system state
      const [users, states, decisions, insights] = await Promise.all([
        prisma.user.count(),
        prisma.userState.groupBy({ by: ["state", "systemState", "transformationPhase"], _count: { _all: true } }),
        prisma.decisionLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.insight.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      ]);

      // Save as AdminSnapshot
      const snapshot = await prisma.adminSnapshot.create({
        data: {
          type: "manual",
          label: `Snapshot manual — ${new Date().toLocaleDateString("es-ES")}`,
          data: { users, states, decisions, insights, createdAt: new Date().toISOString() },
          summary: `Snapshot manual: ${users} usuarios, ${decisions.length} decisiones, ${insights.length} insights`,
          recordCount: decisions.length + insights.length,
        },
      });

      data = { snapshotId: snapshot.id, message: "Snapshot creado correctamente" };
      filename = "snapshot";
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  logInfo("ADMIN", "data_exported", { type, format, anonymize, records: Array.isArray(data) ? data.length : 1 });

  if (format === "csv" && Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvRows = [
      headers.join(","),
      ...data.map((row) => {
        const r = row as Record<string, unknown>;
        return headers.map((h) => {
          const val = r[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(",");
      }),
    ];
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  return NextResponse.json({ data, meta: { type, format, anonymize, exportedAt: new Date().toISOString() } });
}, { limit: 5 });
