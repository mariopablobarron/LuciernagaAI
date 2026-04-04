import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveFamilyPortal, deliverSupportMessage } from "@/services/family";

// POST /api/family/[token]/support-message
// Body: { content: string; scheduledAt?: string (ISO) }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const contact = await resolveFamilyPortal(token);
  if (!contact) {
    return NextResponse.json({ error: "Portal no encontrado." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    content?: string;
    scheduledAt?: string;
  } | null;

  if (!body?.content?.trim()) {
    return NextResponse.json({ error: "content es requerido" }, { status: 400 });
  }

  const content = body.content.trim().slice(0, 600);
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const deliverNow = !scheduledAt || scheduledAt <= new Date();

  const prisma = getPrismaClient();
  const msg = await prisma.supportMessage.create({
    data: {
      userId: contact.user.id,
      trustedContactId: contact.id,
      fromName: contact.name,
      content,
      scheduledAt,
      deliveredAt: deliverNow ? new Date() : null,
    },
    select: { id: true, content: true, deliveredAt: true },
  });

  if (deliverNow) {
    void deliverSupportMessage(msg.id);
  }

  return NextResponse.json({ ok: true, message: msg }, { status: 201 });
}

// GET /api/family/[token]/support-message — list sent messages (for family's own history)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const contact = await resolveFamilyPortal(token);
  if (!contact) {
    return NextResponse.json({ error: "Portal no encontrado." }, { status: 404 });
  }

  const prisma = getPrismaClient();
  const messages = await prisma.supportMessage.findMany({
    where: { trustedContactId: contact.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, content: true, deliveredAt: true, readAt: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}
