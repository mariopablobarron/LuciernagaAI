import { type NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// ─── Basic moderation word list ─────────────────────────────────────────────

const BLOCKED_WORDS = [
  "matar",
  "suicid",
  "violar",
  "viola",
  "porno",
  "nazi",
  "terroris",
  "bomba",
];

function containsBlockedContent(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return BLOCKED_WORDS.some((w) => normalized.includes(w));
}

// ─── GET — list recent posts ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const posts = await prisma.communityPost.findMany({
      where: { hidden: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true } },
      },
    });

    const mapped = posts.map((p) => ({
      id: p.id,
      content: p.content,
      phase: p.phase,
      anonymous: p.anonymous,
      authorName: p.anonymous ? null : (p.user.name?.split(" ")[0] ?? null),
      likes: p.likes,
      createdAt: p.createdAt.toISOString(),
    }));

    const response = NextResponse.json({ ok: true, posts: mapped });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
      clearSessionCookie(res);
      return res;
    }
    logError("COMMUNITY_API", error, { action: "list_posts" });
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 },
    );
  }
}

// ─── POST — create a new post ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      content?: string;
      phase?: string;
      anonymous?: boolean;
    };

    const content = body.content?.trim();
    if (!content || content.length < 5) {
      return NextResponse.json(
        { ok: false, error: "El contenido es demasiado corto." },
        { status: 400 },
      );
    }
    if (content.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "Máximo 1000 caracteres." },
        { status: 400 },
      );
    }

    if (containsBlockedContent(content)) {
      return NextResponse.json(
        { ok: false, error: "El contenido no cumple las normas de la comunidad." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    const post = await prisma.communityPost.create({
      data: {
        userId: identity.userId,
        content,
        phase: body.phase?.trim() || null,
        anonymous: body.anonymous !== false, // default true
      },
    });

    const response = NextResponse.json(
      {
        ok: true,
        post: {
          id: post.id,
          content: post.content,
          phase: post.phase,
          anonymous: post.anonymous,
          likes: post.likes,
          createdAt: post.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
      clearSessionCookie(res);
      return res;
    }
    logError("COMMUNITY_API", error, { action: "create_post" });
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
