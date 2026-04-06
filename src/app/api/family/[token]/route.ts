import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { resolveConversationForUser, saveConversationMessage } from "@/services/conversation";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { message, conversationId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });
    }

    // 1. Resuelve la conversación existente o crea una nueva (si era un draft)
    const conversation = await resolveConversationForUser(identity.userId, conversationId, message);

    // 2. Guarda ÚNICAMENTE el mensaje del usuario en la Base de Datos
    await saveConversationMessage({
      conversationId: conversation.id,
      userId: identity.userId,
      role: "user",
      content: message,
      updateTitleFromUserMessage: !conversationId, // Si es conversación nueva, genera el título
    });

    return NextResponse.json({ success: true, conversationId: conversation.id });
  } catch (error: unknown) {
    logError("JOURNAL", error, { route: "/api/journal" });
    return NextResponse.json(
      { success: false, error: "Fallo al guardar la entrada del diario" },
      { status: 500 }
    );
  }
}
