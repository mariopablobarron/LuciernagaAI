import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LEGACY_DOMAIN = "@session.luciernaga.local";
const NEW_DOMAIN = "@session.latidos.local";

/**
 * Rewrites emails of users with legacy synthetic domain (@session.luciernaga.local)
 * to the current one (@session.latidos.local). Only targets users that have
 * activity (messages > 0) — empty shells are left for purge-anonymous-dormant.
 *
 * POST ?dryRun=1 returns affected count + sample without writing.
 */
export const POST = withRateLimit(
  async function POST(req: NextRequest) {
    try {
      const adminAuth = requireAdminPermission(req, "users:update");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const url = new URL(req.url);
      const dryRun = url.searchParams.get("dryRun") === "1";
      const prisma = getPrismaClient();

      const where = {
        deletedAt: null,
        email: { endsWith: LEGACY_DOMAIN },
        messages: { some: {} },
      } as const;

      const candidates = await prisma.user.findMany({
        where,
        select: { id: true, email: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      if (dryRun) {
        logInfo("ADMIN", "normalize_legacy_domains_dryrun", { total: candidates.length });
        return NextResponse.json({
          mode: "dryRun",
          candidates: candidates.length,
          sample: candidates.slice(0, 10),
        });
      }

      let updated = 0;
      const skipped: Array<{ id: string; reason: string }> = [];
      for (const u of candidates) {
        const newEmail = u.email.replace(LEGACY_DOMAIN, NEW_DOMAIN);
        try {
          await prisma.user.update({
            where: { id: u.id },
            data: { email: newEmail },
          });
          updated++;
        } catch (error) {
          skipped.push({
            id: u.id,
            reason: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      logInfo("ADMIN", "normalize_legacy_domains_executed", {
        updated,
        skipped: skipped.length,
      });

      return NextResponse.json({
        mode: "executed",
        candidates: candidates.length,
        updated,
        skipped,
      });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "POST /api/admin/users/normalize-legacy-domains" });
      return NextResponse.json(
        { error: "NORMALIZE_FAILED", message: "No se pudo ejecutar la normalización." },
        { status: 500 },
      );
    }
  },
  { limit: 5 },
);
