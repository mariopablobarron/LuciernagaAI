/**
 * POST /api/user/auto-delete
 *
 * Toggle del opt-in "borrar mis datos si no vuelvo en 30 días".
 * Persiste en UserPreferences.autoDeleteAfter30dInactive.
 *
 * El borrado real lo ejecuta el cron /api/cron/auto-delete-inactive
 * (programado en crontab del VPS).
 *
 * Body: { enabled: boolean }
 * Respuesta: { ok: true, enabled: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      const identity = await resolveIdentity(req);
      userId = identity.userId;
    } catch (err) {
      if (err instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
      throw err;
    }

    const body = (await req.json().catch(() => null)) as { enabled?: unknown } | null;
    if (typeof body?.enabled !== "boolean") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const enabled = body.enabled;

    const prisma = getPrismaClient();
    // Upsert para crear UserPreferences si no existe todavía (usuarios
    // anteriores al campo). El default false aplica a quien no toque.
    await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, autoDeleteAfter30dInactive: enabled },
      update: { autoDeleteAfter30dInactive: enabled },
    });

    logInfo("USER", "auto_delete_toggled", { userId, enabled });
    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    logError("USER", err, { route: "/api/user/auto-delete" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/user/auto-delete
 *
 * Devuelve el estado actual del toggle para el usuario.
 * Útil para hidratar la UI al abrir el modal de "Mis datos".
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string;
    try {
      const identity = await resolveIdentity(req);
      userId = identity.userId;
    } catch (err) {
      if (err instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
      throw err;
    }

    const prisma = getPrismaClient();
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { autoDeleteAfter30dInactive: true },
    });

    return NextResponse.json({ enabled: prefs?.autoDeleteAfter30dInactive ?? false });
  } catch (err) {
    logError("USER", err, { route: "/api/user/auto-delete:GET" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
