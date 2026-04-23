import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateUserDisabledCache } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/users/[id]/anonymize
// GDPR art. 17 (right to erasure) but keeping aggregate metrics alive:
// replaces PII (email, name, passwordHash, telegramId, googleId, phone, bio,
// avatarData, stripeCustomerId) with neutral values and soft-deletes the user.
// Messages, goals, crisis events etc. stay for analytics but are no longer
// attributable to a real person.
// Requires X-Confirm-Anonymize: true header.
export const POST = withRateLimit(
  async function POST(req: NextRequest, ctx: unknown) {
    try {
      const adminAuth = requireAdminPermission(req, "users:delete");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const { id } = await (ctx as Params).params;
      if (!id) {
        return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
      }

      if (req.headers.get("X-Confirm-Anonymize") !== "true") {
        return NextResponse.json(
          {
            error: "CONFIRMATION_REQUIRED",
            message: "Anonymize requires the header X-Confirm-Anonymize: true.",
          },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();
      const existing = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
      }

      const neutralEmail = `anon_${id}@deleted.local`;

      await prisma.user.update({
        where: { id },
        data: {
          email: neutralEmail,
          name: null,
          passwordHash: null,
          telegramId: null,
          googleId: null,
          phone: null,
          bio: null,
          avatarData: null,
          stripeCustomerId: null,
          tags: [],
          isActive: false,
          deletedAt: new Date(),
        },
      });

      invalidateUserDisabledCache(id);

      audit({
        actorId: adminAuth.adminName ?? "admin",
        actorType: "admin",
        action: "update",
        resource: "User",
        resourceId: id,
        metadata: { action: "anonymize", previousEmail: existing.email },
      });

      logInfo("ADMIN", "user_anonymized", { userId: id });

      return NextResponse.json({ success: true, action: "anonymized", userId: id });
    } catch (error) {
      logError("ADMIN", error, { route: "POST /api/admin/users/[id]/anonymize" });
      return NextResponse.json(
        { error: "ANONYMIZE_FAILED", message: "No se pudo anonimizar el usuario." },
        { status: 500 },
      );
    }
  },
  { limit: 5 },
);
