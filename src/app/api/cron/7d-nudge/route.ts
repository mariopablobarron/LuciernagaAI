import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { build7dNudgeEmail, sendUserEmail } from "@/lib/email";
import { pickEmailLocale } from "@/lib/email-i18n";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { isSyntheticEmail } from "@/services/user";
import { trackSafe } from "@/services/events";
import { requireCronSecret } from "@/lib/cron-auth";
import { withCronDedup, dailyUtcKey } from "@/lib/cron-log";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/7d-nudge?secret=CRON_SECRET
 *
 * Reactivación específica a los 7 días. A diferencia de 24h-nudge (que
 * dispara para messageCount=0), este se manda a usuarios que YA escribieron
 * al menos un mensaje y llevan ~7 días sin volver.
 *
 * Devuelve la última frase del propio usuario en el email como gancho
 * concreto, no genérico. Coherente con el marco pedagógico (interpelar con
 * material propio del usuario, no instruir).
 *
 * Anti-spam: NUDGE_7D_SENT en Event registra cada envío. No re-envía si
 * hubo otro nudge_7d en los últimos 14 días.
 *
 * Run daily.
 */
const WINDOW_START_DAYS = 8; // lastSeen más antiguo que esto → demasiado lejos
const WINDOW_END_DAYS = 6; // lastSeen más reciente que esto → demasiado pronto
const COOLDOWN_DAYS = 14;
const TAKE_LIMIT = 200;

const dedupedHandler = withCronDedup("7d-nudge", () => dailyUtcKey(), async () => {

  const prisma = getPrismaClient();
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_START_DAYS * 86400000);
  const windowEnd = new Date(now - WINDOW_END_DAYS * 86400000);
  const cooldownCutoff = new Date(now - COOLDOWN_DAYS * 86400000);

  try {
    const candidates = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        emailVerified: true,
        messageCount: { gt: 0 },
        lastSeen: { gte: windowStart, lte: windowEnd },
        // No re-enviar a quien ya recibió un 7d-nudge en los últimos 14 días.
        events: {
          none: {
            type: "NUDGE_7D_SENT",
            createdAt: { gte: cooldownCutoff },
          },
        },
      },
      select: { id: true, email: true, name: true, locale: true },
      take: TAKE_LIMIT,
    });

    const appUrl = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";
    let sent = 0;
    let skippedSynthetic = 0;
    let skippedNoMessage = 0;
    let errors = 0;

    for (const user of candidates) {
      if (isSyntheticEmail(user.email)) {
        skippedSynthetic++;
        continue;
      }

      const lastUserMessage = await prisma.message.findFirst({
        where: { userId: user.id, role: "user" },
        orderBy: { createdAt: "desc" },
        select: { content: true },
      });

      if (!lastUserMessage || lastUserMessage.content.trim().length === 0) {
        skippedNoMessage++;
        continue;
      }

      try {
        const email = build7dNudgeEmail({
          name: user.name,
          lastUserPhrase: lastUserMessage.content,
          appUrl,
          locale: pickEmailLocale(user.locale),
        });
        const ok = await sendUserEmail({
          to: user.email,
          ...email,
          userId: user.id,
          template: "nudge_7d",
        });

        if (ok) {
          sent++;
          await trackSafe({ userId: user.id, type: "NUDGE_7D_SENT" });
        } else {
          errors++;
        }
        await new Promise((r) => setTimeout(r, 200)); // throttle
      } catch (err) {
        logError("CRON", err, { userId: user.id, action: "7d_nudge" });
        errors++;
      }
    }

    logInfo("CRON", "7d_nudge_done", {
      candidates: candidates.length,
      sent,
      skippedSynthetic,
      skippedNoMessage,
      errors,
    });
    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      sent,
      skippedSynthetic,
      skippedNoMessage,
      errors,
    });
  } catch (error) {
    logError("CRON", error, { action: "7d_nudge_failed" });
    sendAutomatedAlert({
      type: "critical",
      title: "Cron falló: 7d-nudge",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;
  return dedupedHandler(req);
}
