import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

// GET /api/blog — public listing of published posts
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(20, Math.max(1, parseInt(searchParams.get("pageSize") ?? "9", 10)));
  const tag = searchParams.get("tag") ?? "";

  const prisma = getPrismaClient();

  const where = {
    status: "published",
    publishedAt: { not: null },
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        tags: true,
        authorName: true,
        publishedAt: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json({
    posts,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
