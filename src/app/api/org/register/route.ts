import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(s);
}

type RegisterBody = {
  orgName?: string;
  slug?: string;
  type?: string;
  contactName?: string;
  contactEmail?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
};

/**
 * POST /api/org/register
 *
 * Self-serve organization registration.
 * Creates the organization + first admin (HR role by default).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`org-register:${ip}`, 3, 60_000 * 60); // 3 per hour
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "TOO_MANY_ATTEMPTS" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as RegisterBody | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    const orgName = body.orgName?.trim() ?? "";
    const slug = body.slug?.trim().toLowerCase() ?? "";
    const type = body.type?.trim() || "company";
    const contactName = body.contactName?.trim() ?? "";
    const contactEmail = body.contactEmail?.trim() ?? "";
    const adminName = body.adminName?.trim() ?? "";
    const adminEmail = body.adminEmail?.trim().toLowerCase() ?? "";
    const adminPassword = body.adminPassword ?? "";

    // Validation
    const errors: string[] = [];
    if (!orgName || orgName.length < 2) errors.push("Nombre de organizacion requerido (min 2 caracteres)");
    if (!isValidSlug(slug)) errors.push("Identificador (slug) invalido: solo letras minusculas, numeros y guiones, 3-50 caracteres");
    if (!["company", "clinic", "school"].includes(type)) errors.push("Tipo debe ser: company, clinic o school");
    if (!adminName) errors.push("Nombre del administrador requerido");
    if (!adminEmail || !isValidEmail(adminEmail)) errors.push("Email del administrador invalido");
    if (adminPassword.length < 8) errors.push("Contrasena debe tener al menos 8 caracteres");

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, error: "VALIDATION_FAILED", details: errors }, { status: 400 });
    }

    const prisma = getPrismaClient();

    // Check if slug is taken
    const existingOrg = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (existingOrg) {
      return NextResponse.json({ ok: false, error: "SLUG_TAKEN" }, { status: 409 });
    }

    // Check if admin email already exists in any org
    const existingAdmin = await prisma.orgAdmin.findFirst({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (existingAdmin) {
      return NextResponse.json({ ok: false, error: "ADMIN_EMAIL_TAKEN" }, { status: 409 });
    }

    // Create organization + first admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          type,
          plan: "team",
          maxUsers: 50,
          contactName: contactName || adminName,
          contactEmail: contactEmail || adminEmail,
        },
      });

      const admin = await tx.orgAdmin.create({
        data: {
          organizationId: org.id,
          email: adminEmail,
          name: adminName,
          role: "hr",
          passwordHash: await hashPassword(adminPassword),
        },
      });

      return { orgId: org.id, orgSlug: org.slug, adminId: admin.id };
    });

    logInfo("ORG", "org_registered", {
      orgId: result.orgId,
      slug,
      adminEmail,
    });

    return NextResponse.json({
      ok: true,
      organization: { id: result.orgId, slug },
      message: "Organizacion creada. Ya puedes iniciar sesion en /org/login",
    });
  } catch (error) {
    logError("ORG", error, { action: "org_register" });
    return NextResponse.json({ ok: false, error: "REGISTER_FAILED" }, { status: 500 });
  }
}
