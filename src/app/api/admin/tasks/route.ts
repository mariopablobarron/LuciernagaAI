import { type NextRequest, NextResponse } from "next/server";
import { resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/tasks?status=pending
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAdminAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    const prisma = getPrismaClient();

    const tasks = await prisma.adminTask.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, tasks });
  } catch (error) {
    logError("TASKS", error, { action: "list_tasks" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH /api/admin/tasks — bulk update: { ids: string[], status: "done"|"skipped", result?: string }
export async function PATCH(req: NextRequest) {
  try {
    const auth = await resolveAdminAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      ids: string[];
      status: "done" | "skipped";
      result?: string;
    };

    const prisma = getPrismaClient();
    await prisma.adminTask.updateMany({
      where: { id: { in: body.ids } },
      data: { status: body.status, result: body.result, doneAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("TASKS", error, { action: "update_tasks" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
