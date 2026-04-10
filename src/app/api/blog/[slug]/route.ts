import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

// GET /api/blog/[slug] — public single post
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const prisma = getPrismaClient();

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      blocks: true,
      coverImage: true,
      tags: true,
      authorName: true,
      publishedAt: true,
    },
  });

  if (!post || post.publishedAt === null) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ post });
}
