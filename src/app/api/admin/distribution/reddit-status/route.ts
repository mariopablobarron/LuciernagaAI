import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getRedditConnectionStatus } from "@/services/discovery/reddit-oauth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/distribution/reddit-status
 *
 * Devuelve estado de conexión OAuth con Reddit para mostrar en UI.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const status = await getRedditConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    logError("DISCOVERY", error, { action: "reddit_status" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
