import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail } from "@/lib/email";
import { sendTelegramNotification } from "@/services/telegram";
import { logError, logInfo } from "@/lib/logger";
import { getNotificationConfig } from "@/lib/notification-config";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_BASE_URL || "https://tresmilmillonesdelatidos.es";

function buildWeeklyReviewEmail(params: {
  name: string | null;
  messagesCount: number;
  checkinsCount: number;
  streakDays: number;
  dominantEmotion: string;
}): { subject: string; html: string; text: string } {
  const { name, messagesCount, checkinsCount, streakDays, dominantEmotion } = params;
  const greeting = name ? `Hola ${name}` : "Hola";

  const subject = "Tu semana en Tres Mil Millones de Latidos";

  const text = [
    `${greeting},`,
    ``,
    `Tu resumen de los últimos 7 días:`,
    `- ${messagesCount} mensajes enviados`,
    `- ${checkinsCount} check-ins completados`,
    `- ${streakDays} días de racha`,
    `- Estado dominante: ${dominantEmotion}`,
    ``,
    `Cada latido cuenta. Sigue así.`,
    ``,
    APP_URL,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#d946ef 100%);padding:24px 32px">
            <span style="color:#fff;font-size:18px;font-weight:700">Tu semana en Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#d4d4d8">
            <p style="margin:0 0 20px;font-size:16px;color:#fff">${greeting},</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa">
              Aquí va tu resumen de los últimos 7 días. Cada número representa un latido con propósito.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td style="padding:12px;background:#27272a;border-radius:8px 0 0 8px;text-align:center;width:25%">
                  <div style="font-size:24px;font-weight:700;color:#fff">${messagesCount}</div>
                  <div style="font-size:11px;color:#71717a;margin-top:4px">mensajes</div>
                </td>
                <td style="padding:12px;background:#27272a;text-align:center;width:25%">
                  <div style="font-size:24px;font-weight:700;color:#fff">${checkinsCount}</div>
                  <div style="font-size:11px;color:#71717a;margin-top:4px">check-ins</div>
                </td>
                <td style="padding:12px;background:#27272a;text-align:center;width:25%">
                  <div style="font-size:24px;font-weight:700;color:#f59e0b">${streakDays}</div>
                  <div style="font-size:11px;color:#71717a;margin-top:4px">días racha</div>
                </td>
                <td style="padding:12px;background:#27272a;border-radius:0 8px 8px 0;text-align:center;width:25%">
                  <div style="font-size:14px;font-weight:600;color:#c4b5fd">${dominantEmotion}</div>
                  <div style="font-size:11px;color:#71717a;margin-top:4px">estado</div>
                </td>
              </tr>
            </table>
            <div style="text-align:center;padding-top:8px">
              <a href="${APP_URL}/app" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">
                Seguir latiendo
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              No sustituye terapia profesional. <a href="${APP_URL}/settings" style="color:#71717a">Gestionar emails</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifConfig = await getNotificationConfig();
  if (!notifConfig.cronWeeklyReview) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled_in_config" });
  }

  const prisma = getPrismaClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Users active in the last 7 days who haven't opted out of weekly emails
    const users = await prisma.user.findMany({
      where: {
        lastSeen: { gte: since },
        isActive: true,
        OR: [
          { preferences: null }, // No preferences = default (opted in)
          { preferences: { weeklyEmailEnabled: true } },
        ],
      },
      select: { id: true, email: true, name: true, telegramId: true },
    });

    let sent = 0;
    let errors = 0;

    let sentTelegram = 0;

    for (const user of users) {
      try {
        const [messagesCount, checkinsCount, streak, userState, avoidanceCount] = await Promise.all([
          prisma.message.count({ where: { userId: user.id, createdAt: { gte: since }, role: "user" } }),
          prisma.dailyLog.count({ where: { userId: user.id, createdAt: { gte: since } } }),
          prisma.streak.findUnique({ where: { userId: user.id }, select: { currentDays: true } }),
          prisma.userState.findUnique({ where: { userId: user.id }, select: { primaryEmotion: true } }),
          prisma.avoidanceEvent.count({ where: { userId: user.id, createdAt: { gte: since } } }),
        ]);

        const streakDays = streak?.currentDays ?? 0;
        const dominantEmotion = userState?.primaryEmotion ?? "calma";

        const email = buildWeeklyReviewEmail({
          name: user.name,
          messagesCount,
          checkinsCount,
          streakDays,
          dominantEmotion,
        });

        const ok = await sendUserEmail({ to: user.email, ...email });
        if (ok) sent++;
        else errors++;
        await new Promise((r) => setTimeout(r, 200)); // throttle: 5 emails/sec max

        // Send via Telegram too
        if (user.telegramId) {
          // Find most avoided action for personalized insight
          const topAvoided = avoidanceCount > 0
            ? await prisma.avoidanceEvent.findFirst({
                where: { userId: user.id, createdAt: { gte: since } },
                select: { action: { select: { description: true } } },
                orderBy: { createdAt: "desc" },
              })
            : null;

          const greeting = user.name ? `${user.name}, ` : "";
          const tgLines = [
            `📊 *Tu semana en Tres Mil Millones de Latidos*`,
            ``,
            `${greeting}aqui va tu resumen:`,
            ``,
            `💬 ${messagesCount} mensajes`,
            `📝 ${checkinsCount} check-ins`,
            `🔥 ${streakDays} dias de racha`,
            `🧠 Estado: ${dominantEmotion}`,
          ];

          if (avoidanceCount > 0) {
            tgLines.push(`⚠️ ${avoidanceCount} evitaciones`);
            if (topAvoided?.action?.description) {
              tgLines.push(`📌 Lo que mas evitas: _${topAvoided.action.description}_`);
            }
          }

          tgLines.push(``);

          // Personalized closing insight
          if (streakDays >= 7 && avoidanceCount === 0) {
            tgLines.push(`Semana impecable. Ni un paso atras.`);
          } else if (avoidanceCount > 3) {
            tgLines.push(`Esta semana evitaste varias cosas. ¿Y si empiezas por la mas pequena?`);
          } else if (checkinsCount === 0) {
            tgLines.push(`No hiciste check-in esta semana. Un minuto al dia marca la diferencia.`);
          } else {
            tgLines.push(`Cada latido cuenta. Sigue asi.`);
          }

          sendTelegramNotification(user.telegramId, tgLines.join("\n"));
          sentTelegram++;
        }
      } catch (err) {
        logError("CRON", err, { userId: user.id, action: "user_weekly_review" });
        errors++;
      }
    }

    logInfo("CRON", "user_weekly_review_done", { candidates: users.length, sent, sentTelegram, errors });
    return NextResponse.json({ ok: true, candidates: users.length, sent, sentTelegram, errors });
  } catch (error) {
    logError("CRON", error, { action: "user_weekly_review_failed" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
