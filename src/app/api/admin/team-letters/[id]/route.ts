import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["pending", "sent", "rejected"]);

type Body = {
  status?: string;
  notes?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAuth = requireAdminPermission(req, "users:send-email");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const { id } = await params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const existing = await prisma.teamLetterRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const data: {
      status?: string;
      notes?: string;
      sentAt?: Date | null;
      sentByAdminId?: string | null;
    } = {};

    if (body.status !== undefined) {
      data.status = body.status;
      // Solo registramos sentAt cuando pasamos a "sent" — si vuelve a pending
      // o rejected, lo limpiamos para no mentir en el historial.
      if (body.status === "sent") {
        data.sentAt = existing.sentAt ?? new Date();
        data.sentByAdminId = adminAuth.adminId ?? adminAuth.role ?? "admin";
      } else {
        data.sentAt = null;
        data.sentByAdminId = null;
      }
    }
    if (body.notes !== undefined) {
      data.notes = body.notes;
    }

    const updated = await prisma.teamLetterRequest.update({ where: { id }, data });

    logInfo("ADMIN", "team_letter_updated", {
      requestId: id,
      newStatus: updated.status,
      adminId: adminAuth.adminId,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    logError("ADMIN", error, { route: "/api/admin/team-letters/[id]", method: "PATCH" });
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
