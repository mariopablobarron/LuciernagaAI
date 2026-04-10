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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { postId } = await params;
    const prisma = getPrismaClient();

    const post = await prisma.communityPost.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
    });

    const response = NextResponse.json({
      ok: true,
      likes: post.likes,
    });

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
    logError("COMMUNITY_API", error, { action: "like_post" });
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
