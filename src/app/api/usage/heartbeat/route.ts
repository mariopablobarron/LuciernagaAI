import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Idle threshold: si el último ping fue hace más de IDLE_MS, la sesión vieja
// se considera cerrada y arrancamos una nueva. Debe ser mayor que el intervalo
// del cliente (30s) con margen para throttling del navegador.
const IDLE_MS = 90_000;

// Cap de duración por heartbeat: evita que una pestaña olvidada o un reloj
// desajustado inflen horas de uso. Si delta > CAP, solo sumamos CAP.
const HEARTBEAT_CAP_MS = 60_000;

const ALLOWED_SURFACES = new Set(["chat", "app"]);

// Roles que NO trackean tiempo de uso — su navegación es interna y
// distorsionaría métricas de retención y engagement reales.
const TRACKED_ROLES = new Set(["user", "coach"]);

function sanitizeSurface(raw: unknown): "chat" | "app" {
  if (typeof raw === "string" && ALLOWED_SURFACES.has(raw)) {
    return raw as "chat" | "app";
  }
  return "app";
}

function sanitizeUserAgent(raw: string | null): string | null {
  if (!raw) return null;
  return raw.slice(0, 200);
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req).catch(() => null);
    if (!identity?.userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    const surface = sanitizeSurface(body?.surface);
    const userAgent = sanitizeUserAgent(req.headers.get("user-agent"));

    const prisma = getPrismaClient();
    const now = new Date();

    // Filtro server-side: no trackeamos admins/superadmins ni cuentas borradas
    const actor = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { role: true, deletedAt: true },
    });
    if (!actor || actor.deletedAt || !TRACKED_ROLES.has(actor.role)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Intento de extender sesión existente
    if (sessionId) {
      const existing = await prisma.usageSession.findUnique({
        where: { id: sessionId },
        select: { id: true, userId: true, lastPingAt: true, durationMs: true, endedAt: true },
      });

      const idleMs = existing ? now.getTime() - existing.lastPingAt.getTime() : Infinity;
      const stillAlive =
        existing &&
        existing.userId === identity.userId &&
        !existing.endedAt &&
        idleMs <= IDLE_MS;

      if (stillAlive && existing) {
        const addMs = Math.min(idleMs, HEARTBEAT_CAP_MS);
        await prisma.usageSession.update({
          where: { id: existing.id },
          data: {
            lastPingAt: now,
            durationMs: existing.durationMs + addMs,
          },
        });
        await touchLastSeen(prisma, identity.userId, now);
        return NextResponse.json({ ok: true, sessionId: existing.id, reused: true });
      }

      // Si la sesión existe pero está idle, la cerramos antes de crear una nueva
      if (existing && existing.userId === identity.userId && !existing.endedAt) {
        await prisma.usageSession.update({
          where: { id: existing.id },
          data: { endedAt: existing.lastPingAt },
        });
      }
    }

    const created = await prisma.usageSession.create({
      data: {
        userId: identity.userId,
        surface,
        userAgent,
        startedAt: now,
        lastPingAt: now,
        durationMs: 0,
      },
      select: { id: true },
    });

    await touchLastSeen(prisma, identity.userId, now);

    return NextResponse.json({ ok: true, sessionId: created.id, reused: false });
  } catch (error) {
    logError("usage.heartbeat", "handler_failed", { message: (error as Error)?.message });
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}

async function touchLastSeen(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  now: Date,
): Promise<void> {
  // Actualización ligera — no bloqueamos la respuesta si falla (p.ej. user borrado)
  await prisma.user
    .update({
      where: { id: userId },
      data: { lastSeen: now },
    })
    .catch(() => undefined);
}
