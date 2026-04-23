import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id]/gdpr-export
// Returns a single JSON with everything GDPR art. 15 requires: user profile,
// messages, goals, crisis/avoidance events, check-ins, notes and assessments.
// Intended for manual delivery to the requesting user.
export async function GET(req: NextRequest, ctx: unknown) {
  try {
    const adminAuth = requireAdminPermission(req, "users:delete");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await (ctx as Params).params;
    if (!id) {
      return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
    }

    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        conversations: true,
        messages: true,
        goals: { include: { actions: true } },
        crisisEvents: true,
        avoidanceEvents: true,
        dailyCheckins: true,
        clinicalNotes: true,
        assessments: true,
        subscriptions: true,
        dailyLogs: true,
        wins: true,
        userChallenges: true,
        userProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    audit({
      actorId: adminAuth.adminName ?? "admin",
      actorType: "admin",
      action: "export",
      resource: "User",
      resourceId: id,
      metadata: { format: "json", reason: "gdpr" },
    });

    logInfo("ADMIN", "gdpr_export", { userId: id });

    return new NextResponse(JSON.stringify(user, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="gdpr-export-${id}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    logError("ADMIN", error, { route: "GET /api/admin/users/[id]/gdpr-export" });
    return NextResponse.json({ error: "EXPORT_FAILED" }, { status: 500 });
  }
}
