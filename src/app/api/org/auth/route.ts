import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logInfo } from "@/lib/logger";
import { createHmac, timingSafeEqual } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { issueOrgToken } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  return createHmac("sha256", "org-admin-salt").update(password).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// POST /api/org/auth — login for org admins
export const POST = withRateLimit(async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    orgSlug?: string;
  } | null;

  if (!body?.email || !body?.password || !body?.orgSlug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  const org = await prisma.organization.findUnique({
    where: { slug: body.orgSlug },
    select: { id: true, name: true, isActive: true },
  });

  if (!org?.isActive) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const admin = await prisma.orgAdmin.findUnique({
    where: { organizationId_email: { organizationId: org.id, email: body.email } },
    select: { id: true, name: true, role: true, passwordHash: true },
  });

  if (!admin || !safeCompare(hashPassword(body.password), admin.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await prisma.orgAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  logInfo("ORG", "org_admin_login", { orgId: org.id, adminId: admin.id, role: admin.role });

  return NextResponse.json({
    ok: true,
    token: issueOrgToken(admin.id), // Signed HMAC token — not the raw admin ID
    admin: { name: admin.name, role: admin.role },
    organization: { id: org.id, name: org.name },
  });
}, { limit: 10 });
