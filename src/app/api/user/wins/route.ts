import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";
import { safeFamilyNotify, notifyTrustedContactOnWin } from "@/services/family";

// GET /api/user/wins — list the last 50 wins
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  const wins = await prisma.win.findMany({
    where: { userId: identity.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, note: true, createdAt: true },
  });

  return NextResponse.json({ wins });
}

// POST /api/user/wins — record a new win
export async function POST(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const body = (await req.json().catch(() => null)) as {
    note?: string;
    sharedWithFamily?: boolean;
  } | null;

  if (!body?.note?.trim())
    return NextResponse.json({ error: "note es requerido" }, { status: 400 });

  const prisma = getPrismaClient();
  const win = await prisma.win.create({
    data: {
      userId: identity.userId,
      note: body.note.trim().slice(0, 300),
      sharedWithFamily: body.sharedWithFamily ?? false,
    },
    select: { id: true, note: true, sharedWithFamily: true, createdAt: true },
  });

  if (win.sharedWithFamily) {
    safeFamilyNotify(
      () => notifyTrustedContactOnWin(identity.userId, win.note),
      "win_family_notify",
    );
  }

  return NextResponse.json({ win }, { status: 201 });
}

// DELETE /api/user/wins?id=xxx
export async function DELETE(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const prisma = getPrismaClient();
  const win = await prisma.win.findFirst({ where: { id, userId: identity.userId } });
  if (!win) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.win.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
