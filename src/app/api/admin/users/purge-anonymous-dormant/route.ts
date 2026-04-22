import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateUserDisabledCache } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const DORMANT_DAYS = 30;

/**
 * Soft-deletes anonymous dormant users that are very unlikely to ever return:
 * - email is synthetic (@session.*.local) OR no passwordHash
 * - 0 messages ever sent
 * - lastSeen older than 30 days
 * - no reachable channel (telegramId, googleId, pushSubscriptions)
 *
 * Marks `deletedAt = now()` + `isActive = false`. Hard-delete runs via retention cron.
 * POST ?dryRun=1 returns counts + sample without writing.
 */
export const POST = withRateLimit(
  async function POST(req: NextRequest) {
    try {
      const adminAuth = requireAdminPermission(req, "users:delete");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const url = new URL(req.url);
      const dryRun = url.searchParams.get("dryRun") === "1";
      const cutoff = new Date(Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000);
      const prisma = getPrismaClient();

      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        lastSeen: { lt: cutoff },
        messages: { none: {} },
        telegramId: null,
        googleId: null,
        pushSubscriptions: { none: {} },
        OR: [
          { passwordHash: null },
          { email: { endsWith: "@session.latidos.local" } },
          { email: { endsWith: "@session.luciernaga.local" } },
        ],
      };

      const [total, sample] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            lastSeen: true,
            isActive: true,
          },
          orderBy: { lastSeen: "asc" },
          take: 10,
        }),
      ]);

      if (dryRun) {
        logInfo("ADMIN", "purge_anonymous_dormant_dryrun", { total, cutoff: cutoff.toISOString() });
        return NextResponse.json({
          mode: "dryRun",
          cutoff: cutoff.toISOString(),
          candidates: total,
          sample,
        });
      }

      const result = await prisma.user.updateMany({
        where,
        data: { deletedAt: new Date(), isActive: false },
      });

      for (const u of sample) {
        invalidateUserDisabledCache(u.id);
      }

      logInfo("ADMIN", "purge_anonymous_dormant_executed", {
        purged: result.count,
        cutoff: cutoff.toISOString(),
      });

      return NextResponse.json({
        mode: "executed",
        cutoff: cutoff.toISOString(),
        purged: result.count,
        sample,
      });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "POST /api/admin/users/purge-anonymous-dormant" });
      return NextResponse.json(
        { error: "PURGE_FAILED", message: "No se pudo ejecutar el purge." },
        { status: 500 },
      );
    }
  },
  { limit: 5 },
);
