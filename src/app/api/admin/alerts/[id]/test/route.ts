import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { sendAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const PERMISSION = "logs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const rule = await prisma.alertRule.findUnique({ where: { id } });
    if (!rule) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await sendAlert({
      type: "info",
      title: `[TEST] ${rule.name}`,
      message:
        `Prueba manual de la regla "${rule.name}".\n` +
        `Nivel: ${rule.level}\n` +
        `Tag: ${rule.tagPattern ?? "(cualquiera)"}\n` +
        `Mensaje: ${rule.messagePattern ?? "(cualquiera)"}\n` +
        `Canal: ${rule.channel}\n` +
        `Throttle: ${rule.throttleMinutes} min`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("ADMIN_ALERTS", err, { route: "/api/admin/alerts/[id]/test" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
