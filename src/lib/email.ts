// Transactional email sending for user-facing messages

import { baseLayout } from "@/lib/email-layout";
import { signUnsubscribeToken } from "@/lib/unsubscribe-token";
import {
  type EmailLocale,
  pickEmailLocale,
  fmtBeats as fmtBeatsLocale,
  fmtNum as fmtNumLocale,
  VERIFICATION_STRINGS,
  PASSWORD_RESET_STRINGS,
  QUIZ_STATE_I18N,
  QUIZ_LEAD_STRINGS,
  HEARTBEAT_STRINGS,
  WELCOME_STRINGS,
  WAITLIST_STRINGS,
} from "@/lib/email-i18n";

export type QuizState = "bloqueo" | "ansiedad" | "duda" | "claridad" | "neutral";
export type { EmailLocale } from "@/lib/email-i18n";

export function buildQuizLeadEmail(params: {
  to: string;
  state: QuizState;
  appUrl: string;
  locale?: EmailLocale;
}): UserEmail {
  const { to, state, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const content = QUIZ_STATE_I18N[loc][state];
  const s = QUIZ_LEAD_STRINGS[loc];

  const subject = s.subjectTpl(content.emoji, content.label);

  const text =
    `${s.textIntro}\n\n` +
    `${s.textStateDetected} ${content.label}\n\n` +
    `${content.headline}\n\n` +
    `${s.textActionHeader}\n${content.action}\n\n` +
    `${s.textPitch}\n\n` +
    `${s.textCta} ${appUrl}`;

  const body = `
            <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.5px">${escapeHtml(s.resultHeader)}</p>
            <p style="margin:0 0 4px;font-size:32px;line-height:1">${escapeHtml(content.emoji)}</p>
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;line-height:1.3;letter-spacing:-0.3px">${escapeHtml(content.label)}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;font-style:italic">"${escapeHtml(content.headline)}"</p>
            <div style="background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:4px;padding:14px 16px;margin-bottom:24px">
              <p style="margin:0 0 6px;font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${escapeHtml(s.actionLabel)}</p>
              <p style="margin:0;font-size:15px;color:#1e1b4b;line-height:1.6;font-weight:500">${escapeHtml(content.action)}</p>
            </div>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.6">${escapeHtml(s.pitch)}</p>`;

  const html = baseLayout({
    theme: "light",
    header: "branded",
    footer: "product",
    body,
    cta: { href: appUrl, label: s.cta },
  });

  return { to, subject, html, text };
}

// ─── Email verification ──────────────────────────────────────────────────────

export function buildVerificationEmail(params: {
  to: string;
  verifyUrl: string;
  name?: string;
  locale?: EmailLocale;
}): UserEmail {
  const { to, verifyUrl, name } = params;
  const loc = pickEmailLocale(params.locale);
  const s = VERIFICATION_STRINGS[loc];
  const safeName = name ? escapeHtml(name) : null;
  const greeting = s.greeting(safeName);

  const text =
    `${greeting},\n\n` +
    `${s.intro}\n\n` +
    `${verifyUrl}\n\n` +
    `${s.hint}\n\n` +
    `${s.ignore}`;

  const body = `
            <p style="margin:0 0 16px;font-size:18px;color:#111;font-weight:600">${greeting},</p>
            <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.6">${escapeHtml(s.intro)}</p>
            <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5">
              ${escapeHtml(s.hint)} ${escapeHtml(s.ignore)}
            </p>`;

  const html = baseLayout({
    theme: "light",
    header: "branded",
    footer: "product",
    body,
    cta: { href: verifyUrl, label: s.cta },
  });

  return { to, subject: s.subject, html, text };
}

// ─── Password reset ──────────────────────────────────────────────────────────

export function buildPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  name?: string | null;
  locale?: EmailLocale;
}): UserEmail {
  const { to, resetUrl, name } = params;
  const loc = pickEmailLocale(params.locale);
  const s = PASSWORD_RESET_STRINGS[loc];
  const safeName = name ? escapeHtml(name) : null;
  const greeting = s.greeting(safeName);

  const text =
    `${greeting},\n\n` +
    `${s.intro}\n\n` +
    `${resetUrl}\n\n` +
    `${s.hint} ${s.ignore}`;

  const body = `
            <p style="margin:0 0 16px;font-size:18px;color:#111;font-weight:600">${greeting},</p>
            <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.6">${escapeHtml(s.intro)}</p>
            <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5">
              ${escapeHtml(s.hint)} ${escapeHtml(s.ignore)}
            </p>`;

  const html = baseLayout({
    theme: "light",
    header: "branded",
    footer: "product",
    body,
    cta: { href: resetUrl, label: s.cta },
  });

  return { to, subject: s.subject, html, text };
}

// ─── Heartbeat Calculator Email ──────────────────────────────────────────────

const AVG_BPM = 72;
const BEATS_PER_HOUR = AVG_BPM * 60;
const BEATS_PER_DAY = BEATS_PER_HOUR * 24;

export function buildHeartbeatEmail(params: {
  to: string;
  beats: number;
  appUrl: string;
  locale?: EmailLocale;
}): UserEmail {
  const { to, beats, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = HEARTBEAT_STRINGS[loc];
  const days = Math.round(beats / BEATS_PER_DAY);
  const hours = Math.round(beats / BEATS_PER_HOUR);
  const songs = Math.round(beats / (AVG_BPM * 3.5));
  const hugs = Math.round(beats / (AVG_BPM * 0.33));
  const beatsStr = fmtBeatsLocale(beats, loc);

  const subject = s.subjectTpl(beatsStr);

  const text = [
    s.reportLabel,
    ``,
    s.introTpl(beatsStr),
    ``,
    `- ${fmtNumLocale(days, loc)} ${s.sunrises}`,
    `- ${fmtNumLocale(hours, loc)} ${s.hours}`,
    `- ${fmtNumLocale(songs, loc)} ${s.songs}`,
    `- ${fmtNumLocale(hugs, loc)} ${s.hugs}`,
    ``,
    s.reframeBody,
    s.reframeTitle,
    ``,
    `${s.nowTitle}:`,
    s.nowBody,
    ``,
    `${s.ctaButton}: ${appUrl}/app`,
    ``,
    `---`,
    ``,
    s.signupPitch,
    ``,
    `${s.signupCta}: ${appUrl}/signup?utm_source=calculator&utm_medium=email&utm_campaign=heartbeat_report`,
    `${s.haveAccount} ${appUrl}/login`,
    ``,
    s.signature,
  ].join("\n");

  const body = `
            <p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.15em;font-weight:600">${escapeHtml(s.reportLabel)}</p>
            <p style="margin:0 0 24px;font-size:36px;font-weight:800;background:linear-gradient(135deg,#c084fc,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1">${beatsStr}</p>
            <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.7">${s.introHtmlTpl(beatsStr)}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <td width="50%" style="padding:6px">
                  <div style="background:#7c3aed10;border:1px solid #7c3aed30;border-radius:10px;padding:16px;text-align:center">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#c4b5fd">${fmtNumLocale(days, loc)}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#71717a">${escapeHtml(s.sunrises)}</p>
                  </div>
                </td>
                <td width="50%" style="padding:6px">
                  <div style="background:#ec489910;border:1px solid #ec489930;border-radius:10px;padding:16px;text-align:center">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#f9a8d4">${fmtNumLocale(songs, loc)}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#71717a">${escapeHtml(s.songs)}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:6px">
                  <div style="background:#06b6d410;border:1px solid #06b6d430;border-radius:10px;padding:16px;text-align:center">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#67e8f9">${fmtNumLocale(hours, loc)}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#71717a">${escapeHtml(s.hours)}</p>
                  </div>
                </td>
                <td width="50%" style="padding:6px">
                  <div style="background:#10b98110;border:1px solid #10b98130;border-radius:10px;padding:16px;text-align:center">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#6ee7b7">${fmtNumLocale(hugs, loc)}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#71717a">${escapeHtml(s.hugs)}</p>
                  </div>
                </td>
              </tr>
            </table>
            <div style="background:#27272a;border-radius:10px;padding:20px;margin:0 0 16px">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#fff">${escapeHtml(s.reframeTitle)}</p>
              <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.6">${escapeHtml(s.reframeBodyLong)}</p>
            </div>
            <p style="margin:0;font-size:15px;color:#e4e4e7;font-weight:600">${escapeHtml(s.emphasizedClose)}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${appUrl}/app`, label: s.ctaButton },
    footerNote: s.footerNote,
  });

  return { to, subject, html, text };
}

const RESEND_URL = "https://api.resend.com/emails";

export type UserEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  userId?: string;
  template?: string;
};

async function createEmailLog(
  email: UserEmail,
): Promise<string | null> {
  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    const row = await prisma.emailLog.create({
      data: {
        userId: email.userId,
        to: email.to,
        template: email.template ?? "unknown",
        subject: email.subject,
        status: "queued",
      },
      select: { id: true },
    });
    return row.id;
  } catch {
    return null;
  }
}

async function updateEmailLog(
  logId: string,
  patch: {
    status: "sent" | "failed";
    providerId?: string | null;
    errorMessage?: string | null;
    sentAt?: Date | null;
  },
): Promise<void> {
  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: patch.status,
        providerId: patch.providerId ?? undefined,
        errorMessage: patch.errorMessage?.slice(0, 4000) ?? undefined,
        sentAt: patch.sentAt ?? undefined,
      },
    });
  } catch {
    // silent — logging failure must not impact send
  }
}

// Resend acepta dos formatos válidos para `from`:
//   1. email@example.com
//   2. Name <email@example.com>
// Coolify v3 a veces envuelve los values con comillas simples/dobles cuando
// contienen `<>` o espacios — y a veces lo hace en capas (p.ej. `"'X'"`).
// Pelamos cualquier combo de comillas/whitespace exteriores y, si el resultado
// no matchea el formato esperado, usamos el default seguro y dejamos warning.
const DEFAULT_EMAIL_FROM = "Tres Mil Millones de Latidos <info@tresmilmillonesdelatidos.es>";
const EMAIL_FROM_RE = /^([^<>@]+\s+<\s*[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\s*>|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/;

function resolveEmailFrom(): string {
  const raw = (process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM).trim();
  // Pelar comillas/espacios exteriores en cualquier orden ('"X"', "'X'", `"X"`...)
  const peeled = raw.replace(/^[\s'"`]+|[\s'"`]+$/g, "").trim();
  if (EMAIL_FROM_RE.test(peeled)) return peeled;
  console.warn(`[EMAIL] EMAIL_FROM has invalid format (raw="${raw}", peeled="${peeled}") — falling back to default`);
  return DEFAULT_EMAIL_FROM;
}

export async function sendUserEmail(email: UserEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveEmailFrom();
  const baseUrl = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";

  const logId = await createEmailLog(email);

  if (!apiKey) {
    console.error(`[EMAIL] RESEND_API_KEY not configured — email to ${email.to} not sent`);
    if (logId) {
      await updateEmailLog(logId, {
        status: "failed",
        errorMessage: "RESEND_API_KEY not configured",
      });
    }
    return false;
  }

  const unsubscribeToken = signUnsubscribeToken(email.to);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email.to)}&token=${encodeURIComponent(unsubscribeToken)}`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    const responseText = await res.text().catch(() => "");

    if (!res.ok) {
      console.error(`[EMAIL] Resend API error ${res.status} for ${email.to}: ${responseText}`);
      if (logId) {
        await updateEmailLog(logId, {
          status: "failed",
          errorMessage: `${res.status}: ${responseText}`,
        });
      }
      return false;
    }

    let providerId: string | null = null;
    try {
      const parsed = responseText ? (JSON.parse(responseText) as { id?: string }) : null;
      providerId = parsed?.id ?? null;
    } catch {
      // ignore parse failures
    }

    if (logId) {
      await updateEmailLog(logId, {
        status: "sent",
        providerId,
        sentAt: new Date(),
      });
    }
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send to ${email.to}:`, err);
    if (logId) {
      await updateEmailLog(logId, {
        status: "failed",
        errorMessage: (err as Error).message,
      });
    }
    return false;
  }
}

export function buildReminderEmail(params: {
  pendingAction: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { pendingAction, appUrl } = params;

  const subject = "Tienes una acción pendiente en Tres Mil Millones de Latidos";

  const text =
    `Han pasado 24 horas desde tu última sesión.\n\n` +
    `Dijiste que harías esto:\n${pendingAction}\n\n` +
    `¿Qué está pasando? Vuelve cuando puedas.\n\n` +
    `${appUrl}`;

  const body = `
            <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Han pasado 24 horas</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111;line-height:1.3;letter-spacing:-0.3px">Tienes algo pendiente</h1>
            <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Lo que dijiste que harías</p>
            <div style="background:#fef9e7;border-left:3px solid #f5c518;border-radius:4px;padding:14px 16px;margin:0 0 24px">
              <p style="margin:0;font-size:18px;color:#222;line-height:1.5">${escapeHtml(pendingAction)}</p>
            </div>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.6">
              ¿Qué está pasando? Puede que necesites ajustar la acción, o simplemente retomar.
            </p>`;

  const html = baseLayout({
    theme: "light",
    header: "branded",
    footer: "product",
    body,
    cta: { href: appUrl, label: "Volver ahora" },
  });

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Waitlist welcome email ──────────────────────────────────────────────────

export function buildWaitlistWelcomeEmail(params: {
  to: string;
  name?: string;
  appUrl: string;
  locale?: EmailLocale;
}): UserEmail {
  const { to, name, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = WAITLIST_STRINGS[loc];
  const safeName = name ? escapeHtml(name) : null;
  const greeting = s.greeting(safeName);
  const signupUrl = `${appUrl}/signup`;

  const text = [
    `${greeting},`,
    ``,
    s.line1,
    ``,
    s.line2,
    ``,
    s.highlight,
    ``,
    signupUrl,
    ``,
    s.closing,
    ``,
    s.signature,
    ``,
    s.disclaimer,
  ].join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.line1)}</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.line2)}</p>
            <div style="background:#27272a;border-left:3px solid #d946ef;border-radius:4px;padding:16px 20px;margin:24px 0">
              <p style="margin:0;font-size:15px;color:#e4e4e7;line-height:1.6;font-weight:500">${escapeHtml(s.highlight)}</p>
            </div>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a">${escapeHtml(s.closing)}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: signupUrl, label: s.cta },
  });

  return { to, subject: s.subject, html, text };
}

// ─── Welcome email ──────────────────────────────────────────────────────────

export function buildWelcomeEmail(params: {
  name: string | null;
  appUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { name, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = WELCOME_STRINGS[loc];
  const firstName = name ? escapeHtml(name.trim().split(/\s+/)[0]) : null;
  const greeting = s.greeting(firstName);

  const subject = firstName ? s.subjectWithName(firstName) : s.subjectAnon;

  const text = [
    `${greeting},`,
    ``,
    s.line1,
    ``,
    s.line2,
    ``,
    // El "highlight" en HTML lleva <br>, en text-plain lo paso a salto natural
    s.highlight.replace(/<br>/g, "\n"),
    ``,
    `${appUrl}/app`,
    ``,
    s.closing,
  ].join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.3px">${greeting},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.line1)}</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.line2)}</p>
            <div style="background:#27272a;border-left:3px solid #d946ef;border-radius:4px;padding:16px 20px;margin:24px 0">
              <p style="margin:0;font-size:18px;color:#e4e4e7;line-height:1.6">${s.highlight}</p>
            </div>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;text-align:center">${escapeHtml(s.closing)}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${appUrl}/app`, label: s.cta },
  });

  return { subject, html, text };
}

// ─── 24h nudge email (user signed up but hasn't returned) ───────────────────

export function build24hNudgeEmail(params: {
  name: string | null;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { name, appUrl } = params;
  const firstName = name ? escapeHtml(name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ?? "Hola";

  const subject = firstName
    ? `${firstName}, ayer empezaste algo`
    : "Ayer empezaste algo";

  const text = [
    `${greeting},`,
    ``,
    `Ayer diste un paso. Hoy toca el segundo.`,
    ``,
    `No necesitas una hora. No necesitas tenerlo claro. Solo necesitas escribir una frase sobre cómo estás ahora mismo.`,
    ``,
    `${appUrl}/app`,
    ``,
    `A veces volver es solo abrir la puerta y decir "hoy estoy así".`,
  ].join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.3px">${greeting},</p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#a1a1aa">Ayer diste un paso. Hoy toca el segundo.</p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#a1a1aa">
              No necesitas una hora. No necesitas tenerlo claro. Solo necesitas escribir una frase sobre cómo estás ahora mismo.
            </p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;text-align:center;font-style:italic">A veces volver es solo abrir la puerta y decir "hoy estoy así".</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${appUrl}/app`, label: "Segundo latido" },
  });

  return { subject, html, text };
}

/**
 * Email "reactivación específica" enviado a los 7 días.
 *
 * A diferencia del 24h-nudge (que dispara para messageCount=0), este se manda
 * a usuarios que YA escribieron al menos un mensaje y llevan 6-8 días sin
 * volver. Devuelve la última frase que ESCRIBIÓ EL USUARIO (no la del mentor)
 * como gancho concreto, no genérico.
 */
export function build7dNudgeEmail(params: {
  name: string | null;
  lastUserPhrase: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { name, appUrl } = params;
  const firstName = name ? escapeHtml(name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ?? "Hola";

  // Truncamos a 140 caracteres para que entre cómodo en el email; sin punto
  // final si la frase ya termina en signo.
  const trimmed = params.lastUserPhrase.trim().replace(/\s+/g, " ");
  const phrase = trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
  const safePhrase = escapeHtml(phrase);

  const subject = firstName
    ? `${firstName}, lo último que dijiste`
    : "Lo último que dijiste";

  const text = [
    `${greeting},`,
    ``,
    `Hace una semana escribiste:`,
    ``,
    `«${phrase}»`,
    ``,
    `¿Sigue ahí?`,
    ``,
    `${appUrl}/app`,
    ``,
    `No hace falta una respuesta larga. Solo una frase nueva.`,
  ].join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.3px">${greeting},</p>
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#a1a1aa">Hace una semana escribiste:</p>
            <blockquote style="margin:0 0 20px;padding:16px 20px;border-left:3px solid #a78bfa;background:#0a0a0a;border-radius:6px;font-family:Georgia,serif;font-size:18px;line-height:1.6;color:#e4e4e7;font-style:italic">
              &laquo;${safePhrase}&raquo;
            </blockquote>
            <p style="margin:0;font-size:18px;line-height:1.6;color:#fff;font-weight:600">¿Sigue ahí?</p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;text-align:center;font-style:italic">No hace falta una respuesta larga. Solo una frase nueva.</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${appUrl}/app`, label: "Escribir una frase nueva" },
  });

  return { subject, html, text };
}

// ─── Family / trusted contact emails ──────────────────────────────────────────

function familyLayout(title: string, body: string, cta?: { href: string; label: string }): string {
  const composedBody = `
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;line-height:1.3;letter-spacing:-0.3px">${title}</h1>
            ${body}`;
  return baseLayout({
    theme: "light",
    header: "family",
    footer: "private",
    body: composedBody,
    cta,
  });
}

const RELATION_GUIDANCE: Record<string, { role: string; doThis: string; dontDoThis: string }> = {
  madre: {
    role: "Tu hijo/a confía en ti para esto. Eso dice mucho de vuestra relación.",
    doThis: "Estar disponible. Un mensaje natural de vez en cuando. Celebrar los pequeños avances.",
    dontDoThis: "Intentar arreglarlo todo. Preguntar si ya entró a la app. Dar sermones.",
  },
  padre: {
    role: "Tu hijo/a confía en ti para esto. Eso dice mucho de vuestra relación.",
    doThis: "Estar disponible. Un mensaje natural de vez en cuando. Celebrar los pequeños avances.",
    dontDoThis: "Intentar arreglarlo todo. Preguntar si ya entró a la app. Dar sermones.",
  },
  pareja: {
    role: "Tu pareja ha elegido compartir este proceso contigo. Eso es un acto de confianza.",
    doThis: "Acompañar sin controlar. Preguntar cómo está sin esperar que hable de la app.",
    dontDoThis: "Usar esta información en discusiones. Vigilar su progreso. Presionar.",
  },
  "amigo/a": {
    role: "Que te haya elegido como apoyo significa que confía en ti de verdad.",
    doThis: "Ser natural. Proponer planes juntos. Enviar un mensaje cuando te acuerdes.",
    dontDoThis: "Cambiar cómo le tratas. Dar consejos no pedidos. Hablar de su proceso con otros.",
  },
  terapeuta: {
    role: "Esta información complementa tu trabajo clínico con consentimiento explícito.",
    doThis: "Usar los datos como contexto entre sesiones. Observar patrones de evitación o crisis.",
    dontDoThis: "Mencionar datos del portal sin que el paciente los traiga primero a sesión.",
  },
};

/** Invite sent to the trusted contact when the user adds them. */
export function buildFamilyInviteEmail(params: {
  userName: string;
  contactName: string;
  relation: string;
  portalUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, relation, portalUrl } = params;
  const guide = RELATION_GUIDANCE[relation] ?? {
    role: "Has sido elegido/a como persona de confianza. Eso es un privilegio.",
    doThis: "Estar presente. Un mensaje natural de vez en cuando. Celebrar avances.",
    dontDoThis: "Presionar. Vigilar. Usar esta información para confrontar.",
  };

  const subject = `${escapeHtml(userName)} confía en ti — portal de apoyo`;
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">Hola ${escapeHtml(contactName)},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>${escapeHtml(userName)}</strong> te ha elegido como su <em>${escapeHtml(relation)}</em> de confianza
      en Tres Mil Millones de Latidos. Está trabajando en su bienestar emocional y ha decidido
      que tú formes parte de ese proceso.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6;font-style:italic;border-left:3px solid #d946ef;padding-left:12px;margin:16px 0">
      ${escapeHtml(guide.role)}
    </p>
    <p style="color:#111;font-size:14px;font-weight:700;margin:20px 0 8px">🟢 Lo que sí puedes hacer:</p>
    <p style="color:#444;font-size:14px;line-height:1.6">${escapeHtml(guide.doThis)}</p>
    <p style="color:#111;font-size:14px;font-weight:700;margin:20px 0 8px">🔴 Lo que no deberías hacer:</p>
    <p style="color:#444;font-size:14px;line-height:1.6">${escapeHtml(guide.dontDoThis)}</p>
    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;padding:14px 16px;margin:20px 0">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:600">Regla de oro</p>
      <p style="margin:8px 0 0;font-size:14px;color:#78350f;line-height:1.6">
        No le menciones lo que ves en el portal. Si le dices "vi que llevas días sin entrar",
        rompes la confianza del proceso. El sistema ya le acompaña.
        Tu papel es estar — no vigilar.
      </p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>Guarda este enlace — es tu acceso permanente:</strong>
    </p>`;
  const text = [
    `Hola ${contactName},`,
    ``,
    `${userName} te ha elegido como su ${relation} de confianza en Tres Mil Millones de Latidos.`,
    ``,
    `${guide.role}`,
    ``,
    `Lo que sí puedes hacer: ${guide.doThis}`,
    `Lo que no deberías hacer: ${guide.dontDoThis}`,
    ``,
    `REGLA DE ORO: No le menciones lo que ves en el portal. Tu papel es estar, no vigilar.`,
    ``,
    `Tu portal: ${portalUrl}`,
  ].join("\n");
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: "Abrir mi portal" }), text };
}

/** Sent when a crisis is detected for the user. */
export function buildFamilyCrisisEmail(params: {
  userName: string;
  contactName: string;
  portalUrl: string;
  appBaseUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, portalUrl } = params;
  const subject = `⚠️ ${escapeHtml(userName)} puede necesitar apoyo ahora`;
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">Hola ${escapeHtml(contactName)},</p>
    <div style="background:#fff3f3;border-left:3px solid #e53e3e;border-radius:4px;padding:14px 16px;margin:16px 0">
      <p style="margin:0;font-size:15px;color:#c53030;font-weight:600">
        Tres Mil Millones de Latidos ha detectado una señal de crisis en la sesión de <strong>${escapeHtml(userName)}</strong>.
      </p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">
      Esto no significa que esté en peligro inmediato, pero puede que agradezca una llamada o mensaje tuyo.
      Un "Hola, estoy aquí" puede marcar la diferencia.
    </p>
    <p style="color:#555;font-size:13px">Si crees que hay riesgo real, contacta servicios de emergencia: <strong>112</strong> (España) / <strong>911</strong></p>`;
  const text = `Hola ${contactName},\n\nTres Mil Millones de Latidos ha detectado una señal de crisis en la sesión de ${userName}.\n\nPuede que agradezca una llamada.\nEmergencias: 112\n\nTu portal: ${portalUrl}`;
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: "Ver portal" }), text };
}

/** Sent when the user hasn't been active for N days. */
export function buildFamilyInactivityEmail(params: {
  userName: string;
  contactName: string;
  daysSilent: number;
  portalUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, daysSilent, portalUrl } = params;
  const subject = `${escapeHtml(userName)} lleva ${daysSilent} días sin actividad en Tres Mil Millones de Latidos`;
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">Hola ${escapeHtml(contactName)},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>${escapeHtml(userName)}</strong> lleva <strong>${daysSilent} días</strong> sin abrir la app ni hacer check-in.
      Puede que esté bien, pero tú pediste que te avisáramos si esto pasaba.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      A veces un mensaje corto de alguien de confianza es lo que necesita para retomar.
    </p>`;
  const text = `Hola ${contactName},\n\n${userName} lleva ${daysSilent} días sin actividad.\n\nTu portal: ${portalUrl}`;
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: "Ver portal" }), text };
}

/** Sent when the user records a win with sharedWithFamily=true. */
export function buildFamilyWinEmail(params: {
  userName: string;
  contactName: string;
  winNote: string;
  portalUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, winNote, portalUrl } = params;
  const subject = `🎉 ${escapeHtml(userName)} ha anotado una victoria`;
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">Hola ${escapeHtml(contactName)},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>${escapeHtml(userName)}</strong> acaba de registrar una victoria en Tres Mil Millones de Latidos y quiso compartirla contigo:
    </p>
    <div style="background:#f0faf0;border-left:3px solid #38a169;border-radius:4px;padding:14px 16px;margin:16px 0">
      <p style="margin:0;font-size:16px;color:#276749;line-height:1.5">"${escapeHtml(winNote)}"</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">¡Vale la pena celebrarlo!</p>`;
  const text = `Hola ${contactName},\n\n${userName} ha anotado una victoria: "${winNote}"\n\nTu portal: ${portalUrl}`;
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: "Ver portal" }), text };
}

/** Sent to the user when a family support message arrives. */
// ─── Weekly letter — notification only (no sensitive content) ─────────────
// The actual letter lives in-app. This email just nudges the user to come
// read it. By design, it contains NO quotes, NO analysis, NO emotional
// content — only the fact that a letter is waiting.

export function buildWeeklyLetterNotificationEmail(params: {
  name: string | null;
  letterId: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ? `Hola ${firstName}` : "Hola";
  const subject = "Tu carta de esta semana está lista";
  const letterUrl = `${params.appUrl}/app?letter=${encodeURIComponent(params.letterId)}`;

  const text = [
    `${greeting},`,
    ``,
    `El mentor te ha escrito una carta sobre esta semana.`,
    `Léela en la app cuando tengas un momento:`,
    letterUrl,
    ``,
    `— Tres Mil Millones de Latidos`,
  ].join("\n");

  const body = `
            <p style="margin:0 0 16px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#a1a1aa">
              El mentor te ha escrito una carta sobre esta semana. Cuando tengas un momento, léela en la app.
            </p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: letterUrl, label: "Leer la carta" },
    footerNote: "Recibes este aviso porque tienes activada la carta semanal.",
  });

  return { subject, html, text };
}

export function buildSupportMessageEmail(params: {
  userEmail: string;
  fromName: string;
  content: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { fromName, content, appUrl } = params;
  const subject = `💌 ${escapeHtml(fromName)} te ha enviado un mensaje de apoyo`;
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>${escapeHtml(fromName)}</strong> te ha dejado este mensaje:
    </p>
    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;padding:14px 16px;margin:16px 0">
      <p style="margin:0;font-size:16px;color:#92400e;line-height:1.6">"${escapeHtml(content)}"</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">Puedes verlo en la app cuando quieras.</p>`;
  const text = `${fromName} te ha enviado un mensaje:\n\n"${content}"\n\nVer en la app: ${appUrl}`;
  return { subject, html: familyLayout(subject, body, { href: appUrl, label: "Ver en la app" }), text };
}

// ─── Circles v2 ──────────────────────────────────────────────────────────────

function circleLayout(subject: string, body: string, cta: { href: string; label: string }): string {
  return baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    width: 560,
    body,
    cta,
    footerNote: subject,
  });
}

export function buildCirclePulseOpenedEmail(params: {
  name: string | null;
  prompt: string;
  weekEnd: Date;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ? `Hola ${firstName}` : "Hola";
  const subject = "Hay un nuevo pulso en tu círculo";
  const url = `${params.appUrl}/community?tab=circle`;
  const closeDate = params.weekEnd.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });

  const text = [
    `${greeting},`,
    ``,
    `Hay un pulso abierto en tu círculo:`,
    ``,
    `«${params.prompt}»`,
    ``,
    `Tienes hasta el ${closeDate} para responder cuando quieras.`,
    `${url}`,
    ``,
    `— Tres Mil Millones de Latidos`,
  ].join("\n");

  const body = `<p style="margin:0 0 16px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#a1a1aa">Hay un pulso abierto en tu círculo. Responde cuando quieras antes del ${escapeHtml(closeDate)}.</p>
<blockquote style="margin:0 0 16px;padding:14px 18px;border-left:3px solid #06b6d4;background:#0e7490/10;color:#e4e4e7;font-style:italic;border-radius:4px;background-color:rgba(6,182,212,0.08)">${escapeHtml(params.prompt)}</blockquote>
<p style="margin:0 0 4px;font-size:13px;color:#71717a">Tu respuesta desbloquea las del resto del círculo.</p>`;

  return { subject, html: circleLayout(subject, body, { href: url, label: "Responder al pulso" }), text };
}

export function buildMentorReflectionEmail(params: {
  name: string | null;
  prompt: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ? `Hola ${firstName}` : "Hola";
  const subject = "Tienes una devolución privada del mentor";
  const url = `${params.appUrl}/community?tab=circle`;

  const text = [
    `${greeting},`,
    ``,
    `El mentor te ha dejado una devolución privada sobre lo que se compartió en el último pulso del círculo.`,
    `Pregunta de la semana: «${params.prompt}»`,
    ``,
    `Léela en la app: ${url}`,
    ``,
    `— Tres Mil Millones de Latidos`,
  ].join("\n");

  const body = `<p style="margin:0 0 16px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#a1a1aa">El mentor te ha dejado una devolución privada sobre el último pulso del círculo. Solo tú la ves.</p>
<blockquote style="margin:0 0 4px;padding:14px 18px;border-left:3px solid #f59e0b;color:#e4e4e7;font-style:italic;border-radius:4px;background-color:rgba(245,158,11,0.08)">${escapeHtml(params.prompt)}</blockquote>`;

  return { subject, html: circleLayout(subject, body, { href: url, label: "Leer la devolución" }), text };
}

export function buildCircleClosingLetterEmail(params: {
  name: string | null;
  circleName: string;
  reason: string;
  body: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ? `Hola ${firstName}` : "Hola";
  const reasonLabel: Record<string, string> = {
    cycle_end: "El ciclo de seis semanas termina",
    drift: "Tu fase ha cambiado",
    left: "Has salido del círculo",
    removed: "El círculo cierra",
  };
  const subject = `Carta de cierre — ${params.circleName}`;
  const url = `${params.appUrl}/community/cartas`;

  const text = [
    `${greeting},`,
    ``,
    `${reasonLabel[params.reason] ?? "Tu paso por el círculo termina"}.`,
    ``,
    params.body,
    ``,
    `Esta carta queda archivada en tu perfil: ${url}`,
    ``,
    `— Tres Mil Millones de Latidos`,
  ].join("\n");

  const html = `<p style="margin:0 0 8px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
<p style="margin:0 0 16px;font-size:13px;color:#a78bfa;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">${escapeHtml(reasonLabel[params.reason] ?? "Cierre")}</p>
<div style="margin:0 0 16px;padding:14px 18px;background:rgba(124,58,237,0.06);border-left:3px solid #7c3aed;border-radius:4px;color:#e4e4e7;font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(params.body)}</div>
<p style="margin:0;font-size:13px;color:#71717a">Esta carta queda archivada en tu perfil. Lo que dijiste y lo que callaste sigue siendo tuyo.</p>`;

  return { subject, html: circleLayout(subject, html, { href: url, label: "Ver mis cartas" }), text };
}
