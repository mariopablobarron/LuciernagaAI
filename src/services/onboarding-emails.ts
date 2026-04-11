import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail, type UserEmail } from "@/lib/email";
import { getDailyQuote } from "@/lib/daily-quotes";
import { logError, logInfo } from "@/lib/logger";

// ─── Templates ───────────────────────────────────────────────────────────────

const APP_URL = process.env.APP_BASE_URL || "https://tresmilmillonesdelatidos.es";

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px 32px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff">💓 Tres Mil Millones de Latidos</p>
        </td></tr>
        <tr><td style="padding:32px">
          ${content}
        </td></tr>
        <tr><td style="padding:0 32px 24px;border-top:1px solid #27272a">
          <p style="margin:16px 0 0;font-size:11px;color:#71717a;line-height:1.5">
            Este email es parte de tu proceso en Tres Mil Millones de Latidos.
            Si no quieres recibirlos, puedes desactivarlos en Ajustes.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin:16px 0;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px">${text}</a>`;
}

type TemplateBuilder = (name: string) => UserEmail & { textOnly: string };

const TEMPLATES: Record<string, TemplateBuilder> = {
  onboarding_day1: (name) => {
    const greeting = name || "Hola";
    return {
      to: "", // filled by caller
      subject: "Tu primer paso ya esta dado",
      textOnly: `${greeting}, ya tienes tu espacio listo. El siguiente paso es simple: abre el chat y escribe como te sientes hoy. No necesitas preparar nada. Solo empieza. ${APP_URL}/app`,
      html: emailShell(`
        <p style="margin:0 0 16px;font-size:16px;color:#e4e4e7;line-height:1.6">
          ${greeting},
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6">
          Ya tienes tu espacio listo. El siguiente paso es simple:
        </p>
        <p style="margin:0 0 8px;font-size:17px;color:#fff;font-weight:600;line-height:1.5">
          Abre el chat y escribe como te sientes hoy.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.5">
          No necesitas preparar nada. No hay respuesta incorrecta. Solo empieza.
        </p>
        ${ctaButton("Abrir mi espacio", `${APP_URL}/app`)}
        <p style="margin:16px 0 0;font-size:13px;color:#52525b;line-height:1.5">
          Tip: los mensajes cortos y honestos funcionan mejor que los largos y pensados.
        </p>
        <p style="margin:12px 0 0;font-size:13px;color:#71717a;font-style:italic;line-height:1.5">
          "${getDailyQuote()}"
        </p>
      `),
      text: `${greeting}, ya tienes tu espacio listo. Abre el chat y escribe como te sientes hoy. ${APP_URL}/app`,
    };
  },

  onboarding_day3: (name) => {
    const greeting = name || "Hola";
    return {
      to: "",
      subject: `${greeting}, ¿sigues ahi?`,
      textOnly: `${greeting}, hace 3 dias diste un paso. No importa si no has vuelto — lo que importa es que hoy puedes. Solo abre el chat y escribe una frase. Como te sientes ahora mismo. Eso es todo. ${APP_URL}/app`,
      html: emailShell(`
        <p style="margin:0 0 16px;font-size:16px;color:#e4e4e7;line-height:1.6">
          ${greeting},
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6">
          Hace 3 dias diste un paso. No importa si no has vuelto desde entonces — lo que importa es que hoy puedes.
        </p>
        <p style="margin:0 0 8px;font-size:17px;color:#fff;font-weight:600;line-height:1.5">
          Solo escribe una frase: como te sientes ahora mismo.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.5">
          No hay respuesta correcta. No tienes que haber avanzado. Solo volver.
        </p>
        ${ctaButton("Volver al chat", `${APP_URL}/app`)}
      `),
      text: `${greeting}, hace 3 dias diste un paso. No importa si no has vuelto. Solo abre el chat y escribe como te sientes. ${APP_URL}/app`,
    };
  },

  onboarding_day7: (name) => {
    const greeting = name || "Hola";
    return {
      to: "",
      subject: "Una semana contigo — tu primer hito",
      textOnly: `${greeting}, llevas una semana. Eso no es poco. La constancia pequena es mas potente que el esfuerzo perfecto. Hoy te propongo algo: define un objetivo para esta semana. Solo uno. El mentor te ayudara a dividirlo en acciones concretas. ${APP_URL}/app`,
      html: emailShell(`
        <p style="margin:0 0 16px;font-size:16px;color:#e4e4e7;line-height:1.6">
          ${greeting},
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6">
          Llevas una semana. Eso no es poco.<br>
          La constancia pequena es mas potente que el esfuerzo perfecto.
        </p>
        <p style="margin:0 0 8px;font-size:17px;color:#fff;font-weight:600;line-height:1.5">
          Hoy te propongo algo:
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#c4b5fd;line-height:1.5">
          Define un objetivo para esta semana. Solo uno.<br>
          El mentor te ayudara a dividirlo en acciones concretas.
        </p>
        ${ctaButton("Definir mi objetivo", `${APP_URL}/app`)}
        <p style="margin:16px 0 0;font-size:13px;color:#52525b;line-height:1.5">
          Si ya tienes un objetivo activo, revisa tu progreso en la tab "Plan".
        </p>
      `),
      text: `${greeting}, llevas una semana. Define un objetivo para esta semana. Solo uno. El mentor te ayudara. ${APP_URL}/app`,
    };
  },

  quiz_followup_day3: (name) => {
    const greeting = name || "Hola";
    return {
      to: "",
      subject: "Tu estado emocional puede haber cambiado",
      textOnly: `${greeting}, hace 3 dias hiciste el test de estado emocional. Las emociones cambian — y a veces solo necesitas nombrarlo de nuevo para desbloquear el siguiente paso. Puedes repetir el test o abrir directamente el chat. ${APP_URL}/test`,
      html: emailShell(`
        <p style="margin:0 0 16px;font-size:16px;color:#e4e4e7;line-height:1.6">
          ${greeting},
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6">
          Hace 3 dias hiciste el test de estado emocional.
          Las emociones cambian — y a veces solo necesitas nombrarlo de nuevo
          para desbloquear el siguiente paso.
        </p>
        ${ctaButton("Repetir el test", `${APP_URL}/test`)}
        <p style="margin:16px 0 0;font-size:14px;color:#71717a;line-height:1.5">
          O si prefieres, <a href="${APP_URL}/app" style="color:#c4b5fd;text-decoration:underline">abre directamente el chat</a> y cuentale al mentor como estas hoy.
        </p>
      `),
      text: `${greeting}, hace 3 dias hiciste el test. Tu estado puede haber cambiado. Repite el test: ${APP_URL}/test o abre el chat: ${APP_URL}/app`,
    };
  },
};

// ─── Schedule onboarding sequence ────────────────────────────────────────────

export async function scheduleOnboardingEmails(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  const now = new Date();

  const emails = [
    { template: "onboarding_day1", delayMs: 30 * 60 * 1000 },             // 30min after signup
    { template: "onboarding_day3", delayMs: 3 * 24 * 60 * 60 * 1000 },   // day 3 (critical retention)
    { template: "onboarding_day7", delayMs: 7 * 24 * 60 * 60 * 1000 },   // day 7
  ];

  await prisma.scheduledEmail.createMany({
    data: emails.map((e) => ({
      userId,
      template: e.template,
      scheduledAt: new Date(now.getTime() + e.delayMs),
    })),
    skipDuplicates: true,
  });

  logInfo("ONBOARDING", "emails_scheduled", { userId, count: emails.length });
}

/** Schedule follow-up for quiz completers who aren't registered users yet */
export async function scheduleQuizFollowup(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  const now = new Date();

  await prisma.scheduledEmail.create({
    data: {
      userId,
      template: "quiz_followup_day3",
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  logInfo("ONBOARDING", "quiz_followup_scheduled", { userId });
}

// ─── Process scheduled emails (called by cron) ──────────────────────────────

export async function processScheduledEmails(): Promise<{ sent: number; skipped: number; errors: number }> {
  const prisma = getPrismaClient();
  const now = new Date();

  const pending = await prisma.scheduledEmail.findMany({
    where: {
      scheduledAt: { lte: now },
      sentAt: null,
      cancelled: false,
    },
    take: 50,
    include: {
      user: { select: { email: true, name: true, preferences: { select: { weeklyEmailEnabled: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of pending) {
    // Skip if user has no real email or disabled emails
    const isSynthetic = item.user.email.endsWith("@session.luciernaga.local");
    if (isSynthetic || item.user.preferences?.weeklyEmailEnabled === false) {
      await prisma.scheduledEmail.update({ where: { id: item.id }, data: { cancelled: true } });
      skipped++;
      continue;
    }

    const builder = TEMPLATES[item.template];
    if (!builder) {
      logError("ONBOARDING", new Error(`Unknown template: ${item.template}`), { id: item.id });
      await prisma.scheduledEmail.update({ where: { id: item.id }, data: { cancelled: true } });
      errors++;
      continue;
    }

    const email = builder(item.user.name ?? "");
    email.to = item.user.email;

    const ok = await sendUserEmail(email);
    if (ok) {
      await prisma.scheduledEmail.update({ where: { id: item.id }, data: { sentAt: now } });
      sent++;
    } else {
      errors++;
    }
  }

  return { sent, skipped, errors };
}
