import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reset-superadmin?secret=CRON_SECRET
 *
 * Emergency-only: regenerates the superadmin password.
 *
 * - Auth: CRON_SECRET (header `x-cron-secret` or `?secret=`).
 * - Generates a strong 32-char random password server-side.
 * - Replaces the passwordHash on the existing superadmin row, or creates a
 *   new superadmin if none exists.
 * - Returns the plaintext password EXACTLY ONCE in the response. There is
 *   no way to retrieve it later — rotate immediately after use.
 *
 * To remove this endpoint after the rotation, just delete the file and
 * redeploy. It's intentionally surgical so it can be cleaned up trivially.
 */
function generatePassword(length = 32): string {
  // URL-safe alphabet, no ambiguous chars.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_";
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const prisma = getPrismaClient();

  try {
    const password = generatePassword(32);
    const passwordHash = await hashPassword(password);

    const existing = await prisma.adminUser.findFirst({
      where: { role: "superadmin" },
      select: { id: true, email: true, name: true },
    });

    let userRecord: { email: string; name: string };
    if (existing) {
      const updated = await prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash, isActive: true },
        select: { email: true, name: true },
      });
      userRecord = updated;
      logInfo("ADMIN_RESET", "superadmin_password_rotated", {
        adminId: existing.id,
      });
    } else {
      const username = process.env.ADMIN_USERNAME?.trim() || "admin";
      const email = process.env.ADMIN_EMAIL?.trim() || `${username}@admin.local`;
      const created = await prisma.adminUser.create({
        data: {
          email,
          name: username,
          role: "superadmin",
          passwordHash,
          isActive: true,
        },
        select: { email: true, name: true },
      });
      userRecord = created;
      logInfo("ADMIN_RESET", "superadmin_created", {});
    }

    return NextResponse.json({
      ok: true,
      message:
        "Superadmin password rotated. Use these credentials ONCE and change the password from the admin panel immediately.",
      username: userRecord.name,
      email: userRecord.email,
      password,
    });
  } catch (error) {
    logError("ADMIN_RESET", error, { route: "/api/admin/reset-superadmin" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
