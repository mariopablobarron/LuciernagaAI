/**
 * GET /api/user/data-summary
 *
 * Devuelve qué sabemos del usuario en BD. Para la promesa "anonymous-first":
 * transparencia total sobre datos guardados. El usuario puede mirarlo cuando
 * quiera desde el botón ⓘ del chat.
 *
 * Cero PII de terceros. Solo lo que está vinculado a su userId.
 *
 * Respuesta:
 * {
 *   isAnonymous: boolean,            // true si su email es @anon synthetic
 *   email: string | null,            // null si anónimo
 *   name: string | null,
 *   locale: string,
 *   ageRange: string | null,
 *   createdAt: ISO string,
 *   conversationsCount: number,
 *   messagesCount: number,
 *   hasActiveGoal: boolean,
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { isSyntheticEmail } from "@/services/user";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let userId: string;
    try {
      const identity = await resolveIdentity(req);
      userId = identity.userId;
    } catch (err) {
      if (err instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
      throw err;
    }

    const prisma = getPrismaClient();
    const [user, conversationsCount, messagesCount, hasGoal] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          locale: true,
          ageRange: true,
          createdAt: true,
        },
      }),
      prisma.conversation.count({ where: { userId } }),
      prisma.message.count({ where: { conversation: { userId } } }),
      prisma.goal
        .findFirst({ where: { userId, status: "active" } })
        .then((g) => !!g)
        .catch(() => false),
    ]);

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const anonymous = isSyntheticEmail(user.email);

    return NextResponse.json({
      isAnonymous: anonymous,
      email: anonymous ? null : user.email,
      name: user.name,
      locale: user.locale,
      ageRange: user.ageRange,
      createdAt: user.createdAt.toISOString(),
      conversationsCount,
      messagesCount,
      hasActiveGoal: hasGoal,
    });
  } catch (err) {
    logError("USER", err, { route: "/api/user/data-summary" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
