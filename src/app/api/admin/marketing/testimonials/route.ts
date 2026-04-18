import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:site_content";

/**
 * Lists all feedback items eligible as testimonials (rating >= 4 OR already public),
 * plus currently-published testimonials ordered.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const [candidates, published] = await Promise.all([
      prisma.feedback.findMany({
        where: {
          OR: [{ rating: { gte: 4 } }, { isPublicTestimonial: true }],
        },
        orderBy: [
          { isPublicTestimonial: "desc" },
          { rating: "desc" },
          { createdAt: "desc" },
        ],
        take: 100,
        select: {
          id: true,
          type: true,
          rating: true,
          message: true,
          createdAt: true,
          isPublicTestimonial: true,
          testimonialOrder: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.feedback.count({ where: { isPublicTestimonial: true } }),
    ]);

    return NextResponse.json({
      candidates,
      publishedCount: published,
    });
  } catch (error: unknown) {
    logError("ADMIN_MARKETING", error, { route: "testimonials_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

type PatchPayload = {
  id?: string;
  isPublicTestimonial?: boolean;
  testimonialOrder?: number | null;
};

/**
 * Toggles or reorders a testimonial. Body: { id, isPublicTestimonial?, testimonialOrder? }.
 */
export async function PATCH(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as PatchPayload;
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const updated = await prisma.feedback.update({
      where: { id: body.id },
      data: {
        ...(body.isPublicTestimonial !== undefined
          ? { isPublicTestimonial: body.isPublicTestimonial }
          : {}),
        ...(body.testimonialOrder !== undefined
          ? { testimonialOrder: body.testimonialOrder }
          : {}),
      },
      select: {
        id: true,
        isPublicTestimonial: true,
        testimonialOrder: true,
      },
    });

    logInfo("ADMIN_MARKETING", "testimonial_updated", {
      id: body.id,
      isPublic: updated.isPublicTestimonial,
      order: updated.testimonialOrder,
      by: auth.adminName,
    });

    return NextResponse.json({ feedback: updated });
  } catch (error: unknown) {
    logError("ADMIN_MARKETING", error, { route: "testimonials_PATCH" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
