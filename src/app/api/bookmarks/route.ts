/**
 * Endpoints de bookmarks de mensajes del mentor.
 *
 * GET  /api/bookmarks       — lista del usuario, ordenada por createdAt desc.
 * POST /api/bookmarks       — añade bookmark. Body: { messageId, note? }
 *                             Si ya existe, devuelve el existente (idempotente).
 *
 * DELETE /api/bookmarks/[id] — quita bookmark por id (ver route hermana)
 *
 * Auth: requiere sesión. Rate limit: 30/h por userId para POST.
 */

import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_NOTE_LENGTH = 500;
const MAX_BOOKMARKS_PER_USER = 200;

async function getUserId(req: NextRequest): Promise<string | NextResponse> {
  try {
    const identity = await resolveIdentity(req);
    return identity.userId;
  } catch (err) {
    if (err instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  try {
    const userIdOrResp = await getUserId(req);
    if (typeof userIdOrResp !== "string") return userIdOrResp;
    const userId = userIdOrResp;

    const prisma = getPrismaClient();
    const bookmarks = await prisma.messageBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        message: {
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
            conversation: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        messageId: b.messageId,
        note: b.note,
        createdAt: b.createdAt.toISOString(),
        message: {
          content: b.message.content,
          role: b.message.role,
          createdAt: b.message.createdAt.toISOString(),
          conversationId: b.message.conversation.id,
          conversationTitle: b.message.conversation.title,
        },
      })),
    });
  } catch (err) {
    logError("BOOKMARKS", err, { route: "/api/bookmarks:GET" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userIdOrResp = await getUserId(req);
    if (typeof userIdOrResp !== "string") return userIdOrResp;
    const userId = userIdOrResp;

    const rl = checkRateLimit(`bookmark:${userId}`, 30, ONE_HOUR_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "TOO_MANY_REQUESTS", retryAfter: rl.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      messageId?: unknown;
      note?: unknown;
    } | null;

    const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : "";
    if (!messageId) {
      return NextResponse.json({ error: "INVALID_MESSAGE_ID" }, { status: 400 });
    }
    const note = typeof body?.note === "string" ? body.note.trim() : null;
    if (note && note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: "NOTE_TOO_LONG", max: MAX_NOTE_LENGTH },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Verificar que el mensaje existe y pertenece al usuario (vía su conversation)
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        role: true,
        conversation: { select: { userId: true } },
      },
    });
    if (!message) {
      return NextResponse.json({ error: "MESSAGE_NOT_FOUND" }, { status: 404 });
    }
    if (message.conversation.userId !== userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    // Solo permitimos bookmarks de respuestas del mentor — el usuario no
    // necesita guardarse a sí mismo, y guardar mensajes propios complicaría
    // la UX del modal de lista.
    if (message.role !== "assistant") {
      return NextResponse.json({ error: "ONLY_ASSISTANT_MESSAGES" }, { status: 400 });
    }

    // Cap: si ya tiene 200, no añadir más (UX: forzar limpieza primero).
    const count = await prisma.messageBookmark.count({ where: { userId } });
    if (count >= MAX_BOOKMARKS_PER_USER) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", max: MAX_BOOKMARKS_PER_USER },
        { status: 400 },
      );
    }

    // Upsert idempotente sobre (userId, messageId).
    const bookmark = await prisma.messageBookmark.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId, note },
      update: note !== null ? { note } : {},
    });

    logInfo("BOOKMARKS", "create", { userId, messageId, hasNote: !!note });
    return NextResponse.json({
      ok: true,
      bookmark: {
        id: bookmark.id,
        messageId: bookmark.messageId,
        note: bookmark.note,
        createdAt: bookmark.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logError("BOOKMARKS", err, { route: "/api/bookmarks:POST" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
