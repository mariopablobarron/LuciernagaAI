import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveFamilyPortal, notifyUserOfPing } from "@/services/family";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// POST /api/family/[token]/ping — send "are you ok?" ping to user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  // Rate-limit by IP to prevent token brute-forcing: 10 attempts per hour
  const ip = getIp(req);
  const rl = checkRateLimit(`family-ping:${ip}`, 10, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Inténtalo más tarde." }, { status: 429 });
  }

  const { token } = await params;

  const contact = await resolveFamilyPortal(token);
  if (!contact) {
    return NextResponse.json({ error: "Portal no encontrado." }, { status: 404 });
  }

  const prisma = getPrismaClient();

  // Rate-limit: max one ping per 4 hours
  const recentPing = await prisma.familyPing.findFirst({
    where: {
      trustedContactId: contact.id,
      createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    },
  });

  if (recentPing) {
    return NextResponse.json(
      { error: "Ya enviaste un ping recientemente. Espera unas horas." },
      { status: 429 },
    );
  }

  const ping = await prisma.familyPing.create({
    data: {
      userId: contact.user.id,
      trustedContactId: contact.id,
    },
    select: { id: true, createdAt: true },
  });

  void notifyUserOfPing(contact.user.id, contact.name).catch((err) =>
    logError("FAMILY", err instanceof Error ? err : new Error(String(err)), { context: "notifyUserOfPing", userId: contact.user.id }),
  );

  return NextResponse.json({ ok: true, pingId: ping.id }, { status: 201 });
}

// CUID2 format validation (starts with letter, 24+ alphanumeric chars)
const CUID_RE = /^[a-z][a-z0-9]{20,}$/i;

// PATCH /api/family/[token]/ping?id=xxx — user responds to ping
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const pingId = req.nextUrl.searchParams.get("id");
  if (!pingId) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  // Validate CUID format to reject obviously malformed IDs early
  if (!CUID_RE.test(pingId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  // This endpoint is hit from the user's app (no family token auth needed here)
  // Validate ping belongs to this portal's user
  const contact = await resolveFamilyPortal(token);
  if (!contact) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { response?: "ok" | "not_ok" } | null;
  if (!body?.response) return NextResponse.json({ error: "response requerido" }, { status: 400 });

  const prisma = getPrismaClient();
  await prisma.familyPing.updateMany({
    where: { id: pingId, userId: contact.user.id, respondedAt: null },
    data: { respondedAt: new Date(), response: body.response },
  });

  return NextResponse.json({ ok: true });
}
