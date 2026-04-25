import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const NAME_MAX = 80;
const ID_MAX = 200;
const APIHOST_MAX = 200;
const NOTES_MAX = 500;

// PATCH — edit name/identifier/apiHost/notes/isActive
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "marketing:metrics");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > NAME_MAX) return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
      data.name = name;
    }
    if (typeof body.identifier === "string") {
      const identifier = body.identifier.trim();
      if (!identifier || identifier.length > ID_MAX || !/^[A-Za-z0-9._\-/:]+$/.test(identifier)) {
        return NextResponse.json({ error: "INVALID_IDENTIFIER" }, { status: 400 });
      }
      data.identifier = identifier;
    }
    if (typeof body.apiHost === "string") {
      const apiHost = body.apiHost.trim();
      if (apiHost === "") {
        data.apiHost = null;
      } else if (apiHost.length > APIHOST_MAX || !/^https?:\/\/[A-Za-z0-9.\-_/:]+$/.test(apiHost)) {
        return NextResponse.json({ error: "INVALID_APIHOST" }, { status: 400 });
      } else {
        data.apiHost = apiHost;
      }
    }
    if (typeof body.notes === "string") {
      const notes = body.notes.trim();
      data.notes = notes === "" ? null : notes.slice(0, NOTES_MAX);
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    if (Object.keys(data).length === 0) return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });

    const prisma = getPrismaClient();
    const tracker = await prisma.customTracker.update({ where: { id }, data });
    logInfo("ADMIN_CUSTOM_TRACKERS", "tracker_updated", { id, fields: Object.keys(data) });
    return NextResponse.json({ tracker });
  } catch (error) {
    logError("ADMIN_CUSTOM_TRACKERS", error, { route: "PATCH /api/admin/marketing/trackers/custom/[id]" });
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAdminPermission(req, "marketing:metrics");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    await prisma.customTracker.delete({ where: { id } });
    logInfo("ADMIN_CUSTOM_TRACKERS", "tracker_deleted", { id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("ADMIN_CUSTOM_TRACKERS", error, { route: "DELETE /api/admin/marketing/trackers/custom/[id]" });
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
