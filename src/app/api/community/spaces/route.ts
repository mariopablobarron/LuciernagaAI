import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await resolveIdentity(req);
    const prisma = getPrismaClient();

    const spaces = await prisma.communitySpace.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        _count: { select: { posts: { where: { hidden: false } } } },
      },
    });

    return NextResponse.json({
      spaces: spaces.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        icon: s.icon,
        postCount: s._count.posts,
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/spaces" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
