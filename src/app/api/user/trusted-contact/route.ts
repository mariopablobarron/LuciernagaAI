import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { resolveIdentity } from "@/lib/auth";
import { sendFamilyInviteEmail } from "@/services/family";
import { logError } from "@/lib/logger";

const VALID_RELATIONS = ["madre", "padre", "pareja", "amigo/a", "hermano/a", "terapeuta", "otro"] as const;

// GET /api/user/trusted-contact
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  const contact = await prisma.trustedContact.findUnique({
    where: { userId: identity.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      relation: true,
      shareProgress: true,
      shareWins: true,
      shareStreak: true,
      notifyOnCrisis: true,
      notifyOnInactivity: true,
      inactivityDays: true,
      inviteSentAt: true,
      lastAccessAt: true,
      createdAt: true,
      // Never expose accessToken to the user's own client
    },
  });

  return NextResponse.json({ contact: contact ?? null });
}

// POST /api/user/trusted-contact — create (sends invite email)
export async function POST(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    relation?: string;
    shareProgress?: boolean;
    shareWins?: boolean;
    shareStreak?: boolean;
    notifyOnCrisis?: boolean;
    notifyOnInactivity?: boolean;
    inactivityDays?: number;
  } | null;

  if (!body?.name?.trim() || !body?.email?.trim()) {
    return NextResponse.json({ error: "name y email son requeridos" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  // Only one trusted contact per user (enforced by @unique on userId).
  // Instead of check-then-create (which races), we attempt the create directly
  // and catch the unique constraint violation (P2002).
  try {
    const contact = await prisma.trustedContact.create({
      data: {
        userId: identity.userId,
        name: body.name.trim().slice(0, 80),
        email: body.email.trim().toLowerCase().slice(0, 200),
        phone: body.phone?.trim().slice(0, 30) ?? null,
        relation: VALID_RELATIONS.includes(body.relation as typeof VALID_RELATIONS[number])
          ? body.relation
          : null,
        shareProgress: body.shareProgress ?? false,
        shareWins: body.shareWins ?? false,
        shareStreak: body.shareStreak ?? false,
        notifyOnCrisis: body.notifyOnCrisis ?? true,
        notifyOnInactivity: body.notifyOnInactivity ?? true,
        inactivityDays: Math.min(Math.max(body.inactivityDays ?? 3, 1), 30),
      },
      select: { id: true, name: true, email: true, relation: true, createdAt: true },
    });

    // Send invite email in background
    void sendFamilyInviteEmail(contact.id).catch((err) =>
      logError("FAMILY", err instanceof Error ? err : new Error(String(err)), { context: "sendFamilyInviteEmail", contactId: contact.id }),
    );

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    // P2002 = unique constraint violation — another request already created the contact
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Ya tienes un contacto de confianza. Actualízalo con PATCH." }, { status: 409 });
    }
    throw err;
  }
}

// PATCH /api/user/trusted-contact — update settings
export async function PATCH(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string | null;
    relation?: string | null;
    shareProgress?: boolean;
    shareWins?: boolean;
    shareStreak?: boolean;
    notifyOnCrisis?: boolean;
    notifyOnInactivity?: boolean;
    inactivityDays?: number;
    resendInvite?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: "Body requerido" }, { status: 400 });

  const prisma = getPrismaClient();
  const existing = await prisma.trustedContact.findUnique({ where: { userId: identity.userId } });
  if (!existing) return NextResponse.json({ error: "No tienes contacto de confianza" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim().slice(0, 80);
  if (body.email?.trim()) data.email = body.email.trim().toLowerCase().slice(0, 200);
  if ("phone" in body) data.phone = body.phone?.trim().slice(0, 30) ?? null;
  if ("relation" in body)
    data.relation = VALID_RELATIONS.includes(body.relation as typeof VALID_RELATIONS[number])
      ? body.relation
      : null;
  if (typeof body.shareProgress === "boolean") data.shareProgress = body.shareProgress;
  if (typeof body.shareWins === "boolean") data.shareWins = body.shareWins;
  if (typeof body.shareStreak === "boolean") data.shareStreak = body.shareStreak;
  if (typeof body.notifyOnCrisis === "boolean") data.notifyOnCrisis = body.notifyOnCrisis;
  if (typeof body.notifyOnInactivity === "boolean") data.notifyOnInactivity = body.notifyOnInactivity;
  if (typeof body.inactivityDays === "number")
    data.inactivityDays = Math.min(Math.max(body.inactivityDays, 1), 30);

  const contact = await prisma.trustedContact.update({
    where: { userId: identity.userId },
    data,
    select: { id: true, name: true, email: true, relation: true, shareProgress: true, shareWins: true, shareStreak: true, notifyOnCrisis: true, notifyOnInactivity: true, inactivityDays: true },
  });

  if (body.resendInvite) void sendFamilyInviteEmail(contact.id).catch((err) =>
    logError("FAMILY", err instanceof Error ? err : new Error(String(err)), { context: "resendFamilyInviteEmail", contactId: contact.id }),
  );

  return NextResponse.json({ contact });
}

// DELETE /api/user/trusted-contact
export async function DELETE(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  const existing = await prisma.trustedContact.findUnique({ where: { userId: identity.userId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.trustedContact.delete({ where: { userId: identity.userId } });
  return NextResponse.json({ ok: true });
}
