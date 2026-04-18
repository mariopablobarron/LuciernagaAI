import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 300; // cache 5 minutes

/**
 * Public endpoint returning curated testimonials for the landing page.
 * No authentication — safe to call from any origin.
 */
export async function GET() {
  try {
    const prisma = getPrismaClient();
    const items = await prisma.feedback.findMany({
      where: { isPublicTestimonial: true },
      orderBy: [
        { testimonialOrder: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 20,
      select: {
        id: true,
        rating: true,
        message: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    const testimonials = items.map((t) => ({
      id: t.id,
      rating: t.rating,
      message: t.message,
      // Only expose first name to protect privacy — and never the email.
      authorName: t.user.name?.split(/\s+/)[0] ?? "Anónimo",
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ testimonials });
  } catch (error: unknown) {
    logError("PUBLIC_TESTIMONIALS", error, { route: "testimonials_public_GET" });
    return NextResponse.json({ testimonials: [] }, { status: 200 });
  }
}
