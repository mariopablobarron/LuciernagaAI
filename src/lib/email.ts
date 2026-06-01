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
  NUDGE_24H_STRINGS,
  NUDGE_7D_STRINGS,
  REMINDER_STRINGS,
  WEEKLY_LETTER_STRINGS,
  FAMILY_RELATION_GUIDANCE,
  type FamilyRelationKey,
  FAMILY_INVITE_STRINGS,
  FAMILY_CRISIS_STRINGS,
  FAMILY_INACTIVITY_STRINGS,
  FAMILY_WIN_STRINGS,
  SUPPORT_MESSAGE_STRINGS,
  CIRCLE_PULSE_OPENED_STRINGS,
  MENTOR_REFLECTION_STRINGS,
  CIRCLE_CLOSING_STRINGS,
  type CircleClosingReason,
} from "@/lib/email-i18n";

// Map locale → BCP47 for Intl.DateTimeFormat.
const LOCALE_BCP47: Record<EmailLocale, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

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
  /** Locale del destinatario — controla el idioma del footer de unsubscribe
   *  que se inyecta automáticamente en sendUserEmail. Si null/ausente → "es". */
  locale?: EmailLocale;
};

// ─── Footer de unsubscribe — visible en todos los emails ──────────────────────
// El header List-Unsubscribe ya existe (Gmail/Outlook lo muestran arriba).
// Esto añade además un footer VISIBLE en el cuerpo del email, para clientes
// que no soportan RFC 8058 o usuarios que prefieren un link clickable claro.
// Añadido 2026-05-31 a petición explícita: "los correos tienen que tener
// el mensaje de no seguir recibiendo".

const UNSUBSCRIBE_FOOTER_STRINGS: Record<EmailLocale, {
  question: string;
  unsubscribe: string;
  manage: string;
  separator: string;
}> = {
  es: {
    question: "¿No quieres recibir más correos como este?",
    unsubscribe: "Cancelar suscripción",
    manage: "Gestionar notificaciones",
    separator: " · ",
  },
  en: {
    question: "Don't want to receive more emails like this?",
    unsubscribe: "Unsubscribe",
    manage: "Manage notifications",
    separator: " · ",
  },
  pt: {
    question: "Não queres receber mais emails como este?",
    unsubscribe: "Cancelar subscrição",
    manage: "Gerir notificações",
    separator: " · ",
  },
  fr: {
    question: "Tu ne veux plus recevoir d'emails comme celui-ci ?",
    unsubscribe: "Se désinscrire",
    manage: "Gérer les notifications",
    separator: " · ",
  },
};

function buildUnsubscribeFooterHtml(unsubscribeUrl: string, settingsUrl: string, locale: EmailLocale): string {
  const s = UNSUBSCRIBE_FOOTER_STRINGS[locale];
  // Inline styles only — los clientes de email no soportan stylesheets externos.
  // Color discreto pero legible, separado del body por un border-top sutil.
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:24px 32px 32px;background:transparent;border-top:1px solid rgba(255,255,255,0.06)">
  <tr><td align="center" style="font-family:system-ui,-apple-system,sans-serif">
    <p style="margin:0 0 6px;font-size:11px;line-height:1.5;color:#71717a">${s.question}</p>
    <p style="margin:0;font-size:11px;line-height:1.5;color:#71717a">
      <a href="${unsubscribeUrl}" style="color:#a78bfa;text-decoration:underline">${s.unsubscribe}</a>${s.separator}<a href="${settingsUrl}" style="color:#a78bfa;text-decoration:underline">${s.manage}</a>
    </p>
  </td></tr>
</table>`;
}

function buildUnsubscribeFooterText(unsubscribeUrl: string, settingsUrl: string, locale: EmailLocale): string {
  const s = UNSUBSCRIBE_FOOTER_STRINGS[locale];
  return `\n\n---\n${s.question}\n${s.unsubscribe}: ${unsubscribeUrl}\n${s.manage}: ${settingsUrl}\n`;
}

/**
 * Inyecta el footer de unsubscribe en el HTML antes del </body>. Si no hay
 * </body> (HTML mal formado o fragment), lo añade al final. Idempotente —
 * NO duplica si ya está marcado con el data-attr.
 */
function injectUnsubscribeFooterHtml(html: string, footerHtml: string): string {
  if (html.includes('data-unsubscribe-footer="injected"')) return html;
  const marked = footerHtml.replace("<table ", '<table data-unsubscribe-footer="injected" ');
  if (html.includes("</body>")) {
    return html.replace("</body>", `${marked}\n</body>`);
  }
  return `${html}${marked}`;
}

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
  const settingsUrl = `${baseUrl}/settings`;
  const locale: EmailLocale = email.locale ?? "es";

  // Inyectar footer visible de unsubscribe en HTML y text. El header
  // List-Unsubscribe ya activa el botón nativo en Gmail/Outlook; esto añade
  // el link visible para clientes sin RFC 8058 o usuarios que prefieren
  // verlo explícito. Idempotente: si el HTML ya lo lleva marcado, no duplica.
  const footerHtml = buildUnsubscribeFooterHtml(unsubscribeUrl, settingsUrl, locale);
  const footerText = buildUnsubscribeFooterText(unsubscribeUrl, settingsUrl, locale);
  const htmlWithFooter = injectUnsubscribeFooterHtml(email.html, footerHtml);
  const textWithFooter = email.text.includes("Cancelar suscripción") ||
    email.text.includes("Unsubscribe") ||
    email.text.includes("Cancelar subscrição") ||
    email.text.includes("Se désinscrire")
    ? email.text
    : email.text + footerText;

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
        html: htmlWithFooter,
        text: textWithFooter,
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
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { pendingAction, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = REMINDER_STRINGS[loc];

  const text =
    `${s.textIntro}\n\n` +
    `${s.textPendingHeader}\n${pendingAction}\n\n` +
    `${s.textQuestion}\n\n` +
    `${appUrl}`;

  const body = `
            <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.5px">${escapeHtml(s.eyebrow)}</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111;line-height:1.3;letter-spacing:-0.3px">${escapeHtml(s.title)}</h1>
            <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.5px">${escapeHtml(s.pendingHeader)}</p>
            <div style="background:#fef9e7;border-left:3px solid #f5c518;border-radius:4px;padding:14px 16px;margin:0 0 24px">
              <p style="margin:0;font-size:18px;color:#222;line-height:1.5">${escapeHtml(pendingAction)}</p>
            </div>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.6">${escapeHtml(s.question)}</p>`;

  const html = baseLayout({
    theme: "light",
    header: "branded",
    footer: "product",
    body,
    cta: { href: appUrl, label: s.cta },
  });

  return { subject: s.subject, html, text };
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
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { name, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = NUDGE_24H_STRINGS[loc];
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
    `${appUrl}/app`,
    ``,
    s.closing,
  ].join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.3px">${greeting},</p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.line1)}</p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.line2)}</p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;text-align:center;font-style:italic">${escapeHtml(s.closing)}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${appUrl}/app`, label: s.cta },
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
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { name, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = NUDGE_7D_STRINGS[loc];
  const firstName = name ? escapeHtml(name.trim().split(/\s+/)[0]) : null;
  const greeting = s.greeting(firstName);

  // Truncamos a 140 caracteres para que entre cómodo en el email; sin punto
  // final si la frase ya termina en signo.
  const trimmed = params.lastUserPhrase.trim().replace(/\s+/g, " ");
  const phrase = trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
  const safePhrase = escapeHtml(phrase);

  const subject = firstName ? s.subjectWithName(firstName) : s.subjectAnon;

  const text = [
    `${greeting},`,
    ``,
    s.weekAgoLine,
    ``,
    `«${phrase}»`,
    ``,
    s.stillThere,
    ``,
    `${appUrl}/app`,
    ``,
    s.closing,
  ].join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.3px">${greeting},</p>
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#a1a1aa">${escapeHtml(s.weekAgoLine)}</p>
            <blockquote style="margin:0 0 20px;padding:16px 20px;border-left:3px solid #a78bfa;background:#0a0a0a;border-radius:6px;font-family:Georgia,serif;font-size:18px;line-height:1.6;color:#e4e4e7;font-style:italic">
              &laquo;${safePhrase}&raquo;
            </blockquote>
            <p style="margin:0;font-size:18px;line-height:1.6;color:#fff;font-weight:600">${escapeHtml(s.stillThere)}</p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;text-align:center;font-style:italic">${escapeHtml(s.closing)}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${appUrl}/app`, label: s.cta },
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

// Mapea una `relation` libre (string del campo TrustedContact.relation) a la
// clave del diccionario FAMILY_RELATION_GUIDANCE. Si no matchea, "default".
function relationKey(relation: string): FamilyRelationKey {
  const known: FamilyRelationKey[] = ["madre", "padre", "pareja", "amigo/a", "terapeuta"];
  return (known as readonly string[]).includes(relation)
    ? (relation as FamilyRelationKey)
    : "default";
}

/** Invite sent to the trusted contact when the user adds them. */
export function buildFamilyInviteEmail(params: {
  userName: string;
  contactName: string;
  relation: string;
  portalUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, relation, portalUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = FAMILY_INVITE_STRINGS[loc];
  const guide = FAMILY_RELATION_GUIDANCE[loc][relationKey(relation)];

  const subject = s.subjectTpl(escapeHtml(userName));
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">${s.greeting(escapeHtml(contactName))},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.introTpl(userName, relation))}</p>
    <p style="color:#444;font-size:15px;line-height:1.6;font-style:italic;border-left:3px solid #d946ef;padding-left:12px;margin:16px 0">
      ${escapeHtml(guide.role)}
    </p>
    <p style="color:#111;font-size:14px;font-weight:700;margin:20px 0 8px">${s.doHeader}</p>
    <p style="color:#444;font-size:14px;line-height:1.6">${escapeHtml(guide.doThis)}</p>
    <p style="color:#111;font-size:14px;font-weight:700;margin:20px 0 8px">${s.dontHeader}</p>
    <p style="color:#444;font-size:14px;line-height:1.6">${escapeHtml(guide.dontDoThis)}</p>
    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;padding:14px 16px;margin:20px 0">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:600">${escapeHtml(s.goldenRuleTitle)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#78350f;line-height:1.6">${escapeHtml(s.goldenRuleBody)}</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>${escapeHtml(s.saveLink)}</strong>
    </p>`;
  const text = [
    `${s.greeting(contactName)},`,
    ``,
    s.introTpl(userName, relation),
    ``,
    guide.role,
    ``,
    `${s.doHeader.replace(/[🟢🔴]\s*/g, "")} ${guide.doThis}`,
    `${s.dontHeader.replace(/[🟢🔴]\s*/g, "")} ${guide.dontDoThis}`,
    ``,
    s.textGoldenRule,
    ``,
    `${s.textPortalLabel} ${portalUrl}`,
  ].join("\n");
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: s.cta }), text };
}

/** Sent when a crisis is detected for the user. */
export function buildFamilyCrisisEmail(params: {
  userName: string;
  contactName: string;
  portalUrl: string;
  appBaseUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, portalUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = FAMILY_CRISIS_STRINGS[loc];

  const subject = s.subjectTpl(escapeHtml(userName));
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">${s.greeting(escapeHtml(contactName))},</p>
    <div style="background:#fff3f3;border-left:3px solid #e53e3e;border-radius:4px;padding:14px 16px;margin:16px 0">
      <p style="margin:0;font-size:15px;color:#c53030;font-weight:600">${escapeHtml(s.alertTpl(userName))}</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.bodyAfter)}</p>
    <p style="color:#555;font-size:13px">${escapeHtml(s.emergencyNote)}</p>`;
  const text = `${s.greeting(contactName)},\n\n${s.textBodyTpl(userName, portalUrl)}`;
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: s.cta }), text };
}

/** Sent when the user hasn't been active for N days. */
export function buildFamilyInactivityEmail(params: {
  userName: string;
  contactName: string;
  daysSilent: number;
  portalUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, daysSilent, portalUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = FAMILY_INACTIVITY_STRINGS[loc];

  const subject = s.subjectTpl(escapeHtml(userName), daysSilent);
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">${s.greeting(escapeHtml(contactName))},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.introTpl(userName, daysSilent))}</p>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.hint)}</p>`;
  const text = `${s.greeting(contactName)},\n\n${s.textBodyTpl(userName, daysSilent, portalUrl)}`;
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: s.cta }), text };
}

/** Sent when the user records a win with sharedWithFamily=true. */
export function buildFamilyWinEmail(params: {
  userName: string;
  contactName: string;
  winNote: string;
  portalUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, winNote, portalUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = FAMILY_WIN_STRINGS[loc];

  const subject = s.subjectTpl(escapeHtml(userName));
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">${s.greeting(escapeHtml(contactName))},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.introTpl(userName))}</p>
    <div style="background:#f0faf0;border-left:3px solid #38a169;border-radius:4px;padding:14px 16px;margin:16px 0">
      <p style="margin:0;font-size:16px;color:#276749;line-height:1.5">"${escapeHtml(winNote)}"</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.closing)}</p>`;
  const text = `${s.greeting(contactName)},\n\n${s.textBodyTpl(userName, winNote, portalUrl)}`;
  return { subject, html: familyLayout(subject, body, { href: portalUrl, label: s.cta }), text };
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
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const loc = pickEmailLocale(params.locale);
  const s = WEEKLY_LETTER_STRINGS[loc];
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = s.greeting(firstName);
  const letterUrl = `${params.appUrl}/app?letter=${encodeURIComponent(params.letterId)}`;

  const text = [
    `${greeting},`,
    ``,
    s.intro,
    letterUrl,
    ``,
    s.signature,
  ].join("\n");

  const body = `
            <p style="margin:0 0 16px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.htmlIntro)}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: letterUrl, label: s.cta },
    footerNote: s.footerNote,
  });

  return { subject: s.subject, html, text };
}

export function buildSupportMessageEmail(params: {
  userEmail: string;
  fromName: string;
  content: string;
  appUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { fromName, content, appUrl } = params;
  const loc = pickEmailLocale(params.locale);
  const s = SUPPORT_MESSAGE_STRINGS[loc];

  const subject = s.subjectTpl(escapeHtml(fromName));
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.introTpl(fromName))}</p>
    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;padding:14px 16px;margin:16px 0">
      <p style="margin:0;font-size:16px;color:#92400e;line-height:1.6">"${escapeHtml(content)}"</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6">${escapeHtml(s.closing)}</p>`;
  const text = s.textBodyTpl(fromName, content, appUrl);
  return { subject, html: familyLayout(subject, body, { href: appUrl, label: s.cta }), text };
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
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const loc = pickEmailLocale(params.locale);
  const s = CIRCLE_PULSE_OPENED_STRINGS[loc];
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = s.greeting(firstName);
  const url = `${params.appUrl}/community?tab=circle`;
  const closeDate = params.weekEnd.toLocaleDateString(LOCALE_BCP47[loc], {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const text = [
    `${greeting},`,
    ``,
    s.introTextTpl(closeDate),
    ``,
    `«${params.prompt}»`,
    ``,
    `${url}`,
    ``,
    s.signature,
  ].join("\n");

  const body = `<p style="margin:0 0 16px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.introHtmlTpl(closeDate))}</p>
<blockquote style="margin:0 0 16px;padding:14px 18px;border-left:3px solid #06b6d4;background:#0e7490/10;color:#e4e4e7;font-style:italic;border-radius:4px;background-color:rgba(6,182,212,0.08)">${escapeHtml(params.prompt)}</blockquote>
<p style="margin:0 0 4px;font-size:13px;color:#71717a">${escapeHtml(s.unlocks)}</p>`;

  return { subject: s.subject, html: circleLayout(s.subject, body, { href: url, label: s.cta }), text };
}

export function buildMentorReflectionEmail(params: {
  name: string | null;
  prompt: string;
  appUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const loc = pickEmailLocale(params.locale);
  const s = MENTOR_REFLECTION_STRINGS[loc];
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = s.greeting(firstName);
  const url = `${params.appUrl}/community?tab=circle`;

  const text = [
    `${greeting},`,
    ``,
    s.textPrefix,
    `${s.weekQuestion} «${params.prompt}»`,
    ``,
    `${url}`,
    ``,
    s.signature,
  ].join("\n");

  const body = `<p style="margin:0 0 16px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#a1a1aa">${escapeHtml(s.intro)}</p>
<blockquote style="margin:0 0 4px;padding:14px 18px;border-left:3px solid #f59e0b;color:#e4e4e7;font-style:italic;border-radius:4px;background-color:rgba(245,158,11,0.08)">${escapeHtml(params.prompt)}</blockquote>`;

  return { subject: s.subject, html: circleLayout(s.subject, body, { href: url, label: s.cta }), text };
}

export function buildCircleClosingLetterEmail(params: {
  name: string | null;
  circleName: string;
  reason: string;
  body: string;
  appUrl: string;
  locale?: EmailLocale;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const loc = pickEmailLocale(params.locale);
  const s = CIRCLE_CLOSING_STRINGS[loc];
  const firstName = params.name ? escapeHtml(params.name.trim().split(/\s+/)[0]) : null;
  const greeting = s.greeting(firstName);

  // Acepta cualquier string; si no es uno conocido, usa reasonFallback.
  const KNOWN_REASONS: CircleClosingReason[] = ["cycle_end", "drift", "left", "removed"];
  const reasonLabel = (KNOWN_REASONS as readonly string[]).includes(params.reason)
    ? s.reasonLabel[params.reason as CircleClosingReason]
    : s.reasonFallback;

  const subject = s.subjectTpl(params.circleName);
  const url = `${params.appUrl}/community/cartas`;

  const text = [
    `${greeting},`,
    ``,
    `${reasonLabel}.`,
    ``,
    params.body,
    ``,
    `${s.textPathLabel} ${url}`,
    ``,
    s.signature,
  ].join("\n");

  const html = `<p style="margin:0 0 8px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
<p style="margin:0 0 16px;font-size:13px;color:#a78bfa;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">${escapeHtml(reasonLabel)}</p>
<div style="margin:0 0 16px;padding:14px 18px;background:rgba(124,58,237,0.06);border-left:3px solid #7c3aed;border-radius:4px;color:#e4e4e7;font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(params.body)}</div>
<p style="margin:0;font-size:13px;color:#71717a">${escapeHtml(s.closing)}</p>`;

  return { subject, html: circleLayout(subject, html, { href: url, label: s.cta }), text };
}
