import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await resolveIdentity(req);
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const body = await req.json();

    const prisma = getPrismaClient();

    // Validar propiedad de la conversación
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: identity.userId },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Construir objeto de actualización dinámico
    const updateData: { title?: string; journalMode?: boolean; rating?: number } = {};
    if (typeof body.title === "string") updateData.title = body.title;
    if (typeof body.journalMode === "boolean") updateData.journalMode = body.journalMode;
    if (typeof body.rating === "number") updateData.rating = body.rating;

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: unknown) {
    logError("CONVERSATION", error, { area: "patch_conversation" });
    return NextResponse.json({ error: "Fallo al actualizar la conversación" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await resolveIdentity(req);
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    const prisma = getPrismaClient();

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: identity.userId },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logError("CONVERSATION", error, { area: "delete_conversation" });
    return NextResponse.json({ error: "Fallo al eliminar la conversación" }, { status: 500 });
  }
}
