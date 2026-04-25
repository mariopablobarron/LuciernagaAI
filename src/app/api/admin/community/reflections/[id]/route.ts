import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { buildMentorReflectionEmail, sendUserEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const MAX_LEN = 2000;
const APP_URL = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/community/reflections/[id]  { content: string }
// Edit reflection content before approval. Cannot edit a published reflection.
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { content?: string } | null;
    const content = body?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
    }
    if (content.length > MAX_LEN) {
      return NextResponse.json({ error: "TOO_LONG", maxLen: MAX_LEN }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const existing = await prisma.mentorReflection.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (existing.publishedAt) {
      return NextResponse.json({ error: "ALREADY_PUBLISHED" }, { status: 409 });
    }

    await prisma.mentorReflection.update({
      where: { id },
      data: { content, source: "approved" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("ADMIN_REFLECTIONS", error, { route: "/api/admin/community/reflections/[id]", method: "PATCH" });
    return NextResponse.json({ error: "EDIT_FAILED" }, { status: 500 });
  }
}

// POST /api/admin/community/reflections/[id]  { action: "approve" | "reject" }
// Approve = mark approved + published (now visible to the user).
// Reject = delete the reflection (it never reaches the user).
export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { action?: string } | null;
    const prisma = getPrismaClient();

    if (body?.action === "approve") {
      const now = new Date();
      const updated = await prisma.mentorReflection.update({
        where: { id },
        data: { approvedAt: now, publishedAt: now, source: "approved" },
        select: {
          id: true,
          userId: true,
          pulseId: true,
          user: { select: { email: true, name: true } },
          pulse: { select: { prompt: true } },
        },
      });
      logInfo("ADMIN_REFLECTIONS", "reflection_approved", { id: updated.id, userId: updated.userId, pulseId: updated.pulseId });

      // Notify the user — failure is non-blocking, the reflection is already published.
      if (updated.user.email) {
        try {
          await sendUserEmail({
            to: updated.user.email,
            userId: updated.userId,
            template: "mentor_reflection_published",
            ...buildMentorReflectionEmail({
              name: updated.user.name,
              prompt: updated.pulse.prompt,
              appUrl: APP_URL,
            }),
          });
        } catch (error) {
          logError("ADMIN_REFLECTIONS", error, { step: "notify_reflection", reflectionId: updated.id });
        }
      }

      return NextResponse.json({ ok: true, id: updated.id, userId: updated.userId, pulseId: updated.pulseId });
    }

    if (body?.action === "reject") {
      const deleted = await prisma.mentorReflection.delete({ where: { id } });
      logInfo("ADMIN_REFLECTIONS", "reflection_rejected", { id: deleted.id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch (error) {
    logError("ADMIN_REFLECTIONS", error, { route: "/api/admin/community/reflections/[id]", method: "POST" });
    return NextResponse.json({ error: "ACTION_FAILED" }, { status: 500 });
  }
}
