import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail } from "@/lib/email";
import { logError, logInfo } from "@/lib/logger";
import { isSyntheticEmail } from "@/services/user";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_BASE_URL || "https://tresmilmillonesdelatidos.es";

function buildWeeklyInactiveReminderEmail(name: string | null): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = name ? `Hola ${name}` : "Hola";

  const subject = "¿Cómo estás? Tu coach te espera";

  const text = [
    `${greeting},`,
    ``,
    `Hace más de una semana que no pasas por aquí.`,
    `No pasa nada — pero quería recordarte que este espacio sigue siendo tuyo.`,
    ``,
    `A veces volver es solo abrir la puerta y decir "hoy estoy así".`,
    ``,
    `${APP_URL}/app`,
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
            <span style="color:#fff;font-size:18px;font-weight:700">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#d4d4d8">
            <p style="margin:0 0 20px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Hace más de una semana que no pasas por aquí. No pasa nada — pero quería recordarte
              que este espacio sigue siendo tuyo.
            </p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a1a1aa">
              A veces volver es solo abrir la puerta y decir <em>"hoy estoy así"</em>.
            </p>
            <div style="text-align:center">
              <a href="${APP_URL}/app" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Volver a mi espacio
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              No sustituye terapia profesional. <a href="${APP_URL}/settings" style="color:#71717a">Dejar de recibir estos emails</a>
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

// GET /api/cron/weekly-inactive-reminder?secret=CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Users inactive for 7+ days who haven't opted out
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        lastSeen: { lt: sevenDaysAgo },
        OR: [
          { preferences: null },
          { preferences: { weeklyEmailEnabled: true } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: 200,
    });

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      if (isSyntheticEmail(user.email)) {
        skipped++;
        continue;
      }

      try {
        const email = buildWeeklyInactiveReminderEmail(user.name);
        const ok = await sendUserEmail({ to: user.email, ...email });
        if (ok) sent++;
        else errors++;
        await new Promise((r) => setTimeout(r, 200)); // throttle: 5 emails/sec max
      } catch (err) {
        logError("CRON", err, { userId: user.id, action: "weekly_inactive_reminder" });
        errors++;
      }
    }

    logInfo("CRON", "weekly_inactive_reminder_done", { candidates: users.length, sent, skipped, errors });
    return NextResponse.json({ ok: true, candidates: users.length, sent, skipped, errors });
  } catch (error) {
    logError("CRON", error, { action: "weekly_inactive_reminder_failed" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
