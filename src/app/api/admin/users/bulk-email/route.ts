import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendUserEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { withRateLimit } from "@/lib/rate-limit";
import { isSyntheticEmail } from "@/services/user";
import { resolveUserIdsFromFilter, type AdminUsersFilter } from "../_shared/resolve-filter";

export const dynamic = "force-dynamic";

const MAX_USERS = 500;

function toHtml(body: string): string {
  return body
    .split("\n")
    .map((line) => (line.trim() ? `<p>${line.replace(/</g, "&lt;")}</p>` : "<br/>"))
    .join("");
}

// POST /api/admin/users/bulk-email
// body: { userIds: string[], subject: string, body: string }
// Envía un email a cada destinatario real (salta emails sintéticos y desactivados).
export const POST = withRateLimit(
  async function POST(req: NextRequest) {
    try {
      const adminAuth = requireAdminPermission(req, "users:send-email");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const body = (await req.json()) as {
        userIds?: unknown;
        filter?: AdminUsersFilter;
        subject?: unknown;
        body?: unknown;
      };

      let userIds: string[] = [];
      let truncated = false;
      let filterTotal = 0;
      if (body.filter && typeof body.filter === "object") {
        const resolved = await resolveUserIdsFromFilter(body.filter);
        userIds = resolved.userIds;
        truncated = resolved.truncated;
        filterTotal = resolved.total;
      } else if (Array.isArray(body.userIds)) {
        userIds = body.userIds
          .filter((x): x is string => typeof x === "string")
          .slice(0, MAX_USERS);
      }
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const messageBody = typeof body.body === "string" ? body.body.trim() : "";

      if (userIds.length === 0) {
        return NextResponse.json({ error: "NO_USERS" }, { status: 400 });
      }
      if (!subject || !messageBody) {
        return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
      }

      const prisma = getPrismaClient();
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, deletedAt: null, isActive: true },
        select: { id: true, email: true, name: true },
      });

      let sent = 0;
      let skipped = 0;
      const failures: string[] = [];

      const htmlBody = toHtml(messageBody);

      for (const u of users) {
        if (isSyntheticEmail(u.email)) {
          skipped++;
          continue;
        }
        try {
          await sendUserEmail({
            to: u.email,
            subject,
            html: htmlBody,
            text: messageBody,
          });
          sent++;
        } catch {
          failures.push(u.id);
        }
      }

      audit({
        actorId: adminAuth.adminName ?? "admin",
        actorType: "admin",
        action: "update",
        resource: "User",
        metadata: {
          bulk: "email",
          requested: userIds.length,
          sent,
          skipped,
          failures: failures.length,
          subject,
        },
      });

      logInfo("ADMIN", "bulk_email", { sent, skipped, failures: failures.length });

      return NextResponse.json({
        success: true,
        requested: userIds.length,
        sent,
        skipped,
        failures: failures.length,
        truncated,
        filterTotal,
      });
    } catch (error) {
      logError("ADMIN", error, { route: "POST /api/admin/users/bulk-email" });
      return NextResponse.json({ error: "BULK_EMAIL_FAILED" }, { status: 500 });
    }
  },
  { limit: 3 },
);
