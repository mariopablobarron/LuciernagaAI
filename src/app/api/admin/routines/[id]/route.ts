import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/routines/[id]
// body: { status?, resultUrl?, notes?, name?, purpose? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      const next = body.status;
      if (!["scheduled", "ran", "cancelled"].includes(next)) {
        return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
      }
      data.status = next;
      if (next === "ran" || next === "cancelled") {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (typeof body.resultUrl === "string") {
      const url = body.resultUrl.trim();
      if (url === "") {
        data.resultUrl = null;
      } else if (!/^https?:\/\/[A-Za-z0-9.\-_/:?=&%#]+$/.test(url) || url.length > 500) {
        return NextResponse.json({ error: "INVALID_RESULT_URL" }, { status: 400 });
      } else {
        data.resultUrl = url;
      }
    }
    if (typeof body.notes === "string") {
      const notes = body.notes.trim();
      data.notes = notes === "" ? null : notes.slice(0, 2000);
    }
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 200) return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
      data.name = name;
    }
    if (typeof body.purpose === "string") {
      const purpose = body.purpose.trim();
      data.purpose = purpose === "" ? null : purpose.slice(0, 1000);
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });

    const prisma = getPrismaClient();
    const updated = await prisma.scheduledAgent.update({ where: { id }, data });
    logInfo("ADMIN_ROUTINES", "routine_updated", { id, fields: Object.keys(data) });
    return NextResponse.json({ routine: updated });
  } catch (error) {
    logError("ADMIN_ROUTINES", error, { route: "PATCH /api/admin/routines/[id]" });
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}

// DELETE /api/admin/routines/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    await prisma.scheduledAgent.delete({ where: { id } });
    logInfo("ADMIN_ROUTINES", "routine_deleted", { id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("ADMIN_ROUTINES", error, { route: "DELETE /api/admin/routines/[id]" });
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
