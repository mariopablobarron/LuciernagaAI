// Transactional email sending for user-facing messages

export type QuizState = "bloqueo" | "ansiedad" | "duda" | "claridad" | "neutral";

const QUIZ_STATE_CONTENT: Record<
  QuizState,
  { emoji: string; label: string; action: string; headline: string }
> = {
  bloqueo: {
    emoji: "🧱",
    label: "Bloqueo mental",
    headline: "Sabes lo que tienes que hacer — pero no puedes empezar.",
    action:
      "Abre ahora el documento, archivo o herramienta del proyecto. Solo abrirlo, sin hacer nada más. En los próximos 2 minutos.",
  },
  ansiedad: {
    emoji: "⚡",
    label: "Ansiedad de acción",
    headline: "Tienes energía — pero se convierte en presión, no en avance.",
    action:
      "Escribe en papel o en un documento: «¿Qué es lo peor concreto que puede pasar?» Una frase. Sin adornos. Nómbralo.",
  },
  duda: {
    emoji: "🌫️",
    label: "Niebla de dirección",
    headline: "Tienes ganas — pero no sabes hacia dónde.",
    action:
      "Responde en 30 segundos: ¿Cuál es el UN objetivo que, si avanzara esta semana, sentiría que hay progreso real? Escríbelo ahora.",
  },
  claridad: {
    emoji: "✨",
    label: "Momento de claridad",
    headline: "Sabes lo que quieres y tienes energía para avanzar.",
    action:
      "Define en una frase el resultado concreto de hoy. No la lista entera: solo la cosa más importante que, si la haces, el día habrá valido.",
  },
  neutral: {
    emoji: "🔵",
    label: "Estado neutro",
    headline: "Estás en punto muerto — ni bloqueado ni en impulso claro.",
    action:
      "Elige una tarea de menos de 20 minutos que lleves postergando. Ponla en tu agenda de hoy con hora exacta.",
  },
};

export function buildQuizLeadEmail(params: {
  to: string;
  state: QuizState;
  appUrl: string;
}): UserEmail {
  const { to, state, appUrl } = params;
  const content = QUIZ_STATE_CONTENT[state];

  const subject = `${content.emoji} Tu diagnóstico: ${content.label}`;

  const text =
    `Tu resultado del test de Tres Mil Millones de Latidos\n\n` +
    `Estado detectado: ${content.label}\n\n` +
    `${content.headline}\n\n` +
    `Tu acción para ahora:\n${content.action}\n\n` +
    `Tres Mil Millones de Latidos te ayuda a hacer seguimiento de tu estado y avanzar con conversaciones orientadas a acción.\n\n` +
    `Empieza gratis → ${appUrl}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#1a1a1a;padding:24px 32px">
            <span style="color:#818cf8;font-size:20px;font-weight:700;letter-spacing:-0.5px">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:14px;color:#888">Tu resultado del test</p>
            <h1 style="margin:0 0 4px;font-size:26px">${escapeHtml(content.emoji)}</h1>
            <h2 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#111;line-height:1.3">
              ${escapeHtml(content.label)}
            </h2>
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;font-style:italic">
              "${escapeHtml(content.headline)}"
            </p>
            <div style="background:#eef2ff;border-left:3px solid #6366f1;border-radius:4px;padding:14px 16px;margin-bottom:28px">
              <p style="margin:0 0 6px;font-size:11px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:.5px">
                Tu acción para ahora
              </p>
              <p style="margin:0;font-size:15px;color:#1e1b4b;line-height:1.6;font-weight:500">
                ${escapeHtml(content.action)}
              </p>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6">
              Tres Mil Millones de Latidos detecta tu estado en cada conversación y te orienta a la acción concreta.
              Sin consejos genéricos. Sin rodeos.
            </p>
            <a href="${appUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
              Empezar gratis →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #eee">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.5">
              Tres Mil Millones de Latidos acompaña — no sustituye ayuda profesional.<br>
              Para darte de baja, responde &quot;baja&quot; a este correo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to, subject, html, text };
}

// ─── Email verification ──────────────────────────────────────────────────────

export function buildVerificationEmail(params: {
  to: string;
  verifyUrl: string;
  name?: string;
}): UserEmail {
  const { to, verifyUrl, name } = params;
  const greeting = name ? `Hola ${escapeHtml(name)}` : "Hola";

  const subject = "Verifica tu email — Tres Mil Millones de Latidos";

  const text =
    `${greeting},\n\n` +
    `Gracias por registrarte en Tres Mil Millones de Latidos.\n\n` +
    `Verifica tu email haciendo clic en este enlace:\n${verifyUrl}\n\n` +
    `El enlace caduca en 24 horas.\n\n` +
    `Si no te has registrado, ignora este mensaje.`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#1a1a1a;padding:24px 32px">
            <span style="color:#818cf8;font-size:20px;font-weight:700;letter-spacing:-0.5px">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;font-size:16px;color:#111;font-weight:600">${greeting},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6">
              Gracias por registrarte. Solo necesitas verificar tu email para empezar.
            </p>
            <p style="text-align:center;margin:0 0 24px">
              <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">
                Verificar mi email
              </a>
            </p>
            <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5">
              El enlace caduca en 24 horas. Si no te has registrado, ignora este mensaje.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee">
            <p style="margin:0;font-size:11px;color:#aaa">Tres Mil Millones de Latidos — mentoria conversacional con IA</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to, subject, html, text };
}

const RESEND_URL = "https://api.resend.com/emails";

export type UserEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendUserEmail(email: UserEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "TresMilMillonesdeLatidos <info@tresmilmillonesdelatidos.es>";

  if (!apiKey) {
    console.error("[EMAIL] RESEND_API_KEY not configured — email not sent");
    return false;
  }

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
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[EMAIL] Resend API error ${res.status}: ${body}`);
    }

    return res.ok;
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
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

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#1a1a1a;padding:24px 32px">
            <span style="color:#f5c518;font-size:20px;font-weight:700;letter-spacing:-0.5px">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:14px;color:#888">Han pasado 24 horas</p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111;line-height:1.3">
              Tienes algo pendiente
            </h1>
            <p style="margin:0 0 8px;font-size:14px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.5px">
              Lo que dijiste que harías
            </p>
            <div style="background:#f5f5f0;border-left:3px solid #f5c518;border-radius:4px;padding:14px 16px;margin-bottom:28px">
              <p style="margin:0;font-size:16px;color:#222;line-height:1.5">${escapeHtml(pendingAction)}</p>
            </div>
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6">
              ¿Qué está pasando? Puede que necesites ajustar la acción, o simplemente retomar.
            </p>
            <a href="${appUrl}" style="display:inline-block;background:#1a1a1a;color:#f5c518;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:15px;font-weight:600">
              Volver ahora →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #eee">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.5">
              Tres Mil Millones de Latidos acompaña — no obliga. Si no es el momento, está bien.<br>
              Para dejar de recibir estos emails, responde "baja" a este correo.
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
}): UserEmail {
  const { to, name, appUrl } = params;
  const greeting = name ? `Hola ${escapeHtml(name)}` : "Hola";
  const signupUrl = `${appUrl}/signup`;

  const subject =
    "Tu transformación empieza aquí — Tres Mil Millones de Latidos";

  const text = [
    `${name ? `Hola ${name}` : "Hola"},`,
    ``,
    `Ya diste el primer paso. Respondiste tres preguntas que la mayoría evita. Eso dice algo de ti.`,
    ``,
    `Tres Mil Millones de Latidos no es otra app de productividad. Es un espacio para ordenar lo que sientes, nombrar lo que te frena y avanzar con acción concreta.`,
    ``,
    `El siguiente paso: crea tu cuenta y empieza tu primera conversación.`,
    ``,
    `${signupUrl}`,
    ``,
    `Sin rodeos. Sin consejos genéricos. Solo tú y la claridad que necesitas.`,
    ``,
    `— Tres Mil Millones de Latidos`,
    ``,
    `Este servicio acompaña — no sustituye ayuda profesional.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#d946ef 100%);padding:28px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#d4d4d8">
            <p style="margin:0 0 20px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Ya diste el primer paso. Respondiste tres preguntas que la mayoría evita.
              Eso dice algo de ti.
            </p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Tres Mil Millones de Latidos no es otra app de productividad. Es un espacio para
              ordenar lo que sientes, nombrar lo que te frena y avanzar con acción concreta.
            </p>
            <div style="background:#27272a;border-left:3px solid #d946ef;border-radius:4px;padding:16px 20px;margin:24px 0">
              <p style="margin:0;font-size:15px;color:#e4e4e7;line-height:1.6;font-weight:500">
                El siguiente paso: crea tu cuenta y empieza tu primera conversación.
              </p>
            </div>
            <div style="text-align:center;margin:28px 0">
              <a href="${signupUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Crear mi cuenta
              </a>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#71717a">
              Sin rodeos. Sin consejos genéricos. Solo tú y la claridad que necesitas.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              Tres Mil Millones de Latidos acompaña — no sustituye ayuda profesional.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to, subject, html, text };
}

// ─── Welcome email ──────────────────────────────────────────────────────────

export function buildWelcomeEmail(params: {
  name: string | null;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { name, appUrl } = params;
  const greeting = name ? `Hola ${escapeHtml(name)}` : "Hola";
  const drexlerQuote = "Todo se transforma. Todo vibra. Todo late.";

  const subject = "Bienvenido/a a Tres Mil Millones de Latidos";

  const text = [
    `${name ? `Hola ${name}` : "Hola"},`,
    ``,
    `Bienvenido/a a Tres Mil Millones de Latidos.`,
    ``,
    `Esto no es una app de productividad. Es un espacio para ordenar tu pensamiento, validar lo que sientes y avanzar con acción concreta.`,
    ``,
    `"${drexlerQuote}" — Jorge Drexler`,
    ``,
    `Tu primer paso: entra y cuéntame cómo estás.`,
    `${appUrl}/app`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#d946ef 100%);padding:28px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#d4d4d8">
            <p style="margin:0 0 20px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Bienvenido/a. Esto no es una app de productividad. Es un espacio para ordenar tu pensamiento,
              validar lo que sientes y avanzar con acción concreta.
            </p>
            <div style="background:#27272a;border-left:3px solid #d946ef;border-radius:4px;padding:16px 20px;margin:24px 0">
              <p style="margin:0;font-size:16px;color:#e4e4e7;line-height:1.6;font-style:italic">
                "${drexlerQuote}"
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a">— Jorge Drexler</p>
            </div>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a1a1aa">
              Tu primer paso: entra y cuéntame cómo estás.
            </p>
            <div style="text-align:center">
              <a href="${appUrl}/app" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Empezar ahora
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              Tres Mil Millones de Latidos acompaña — no sustituye ayuda profesional.
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

// ─── Family / trusted contact emails ──────────────────────────────────────────

function familyLayout(title: string, body: string, cta?: { href: string; label: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="background:#1a1a1a;padding:20px 32px">
          <span style="color:#f5c518;font-size:18px;font-weight:700">Tres Mil Millones de Latidos</span>
          <span style="color:#888;font-size:12px;margin-left:8px">— red de apoyo</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#111;line-height:1.3">${title}</h1>
          ${body}
          ${cta ? `<p style="margin:28px 0 0"><a href="${cta.href}" style="display:inline-block;background:#1a1a1a;color:#f5c518;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">${cta.label} →</a></p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">Este mensaje es confidencial. No lo reenvíes sin permiso del usuario.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Invite sent to the trusted contact when the user adds them. */
export function buildFamilyInviteEmail(params: {
  userName: string;
  contactName: string;
  relation: string;
  portalUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { userName, contactName, relation, portalUrl } = params;
  const subject = `${escapeHtml(userName)} te ha añadido como contacto de confianza en Tres Mil Millones de Latidos`;
  const body = `
    <p style="color:#444;font-size:15px;line-height:1.6">Hola ${escapeHtml(contactName)},</p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>${escapeHtml(userName)}</strong> te ha designado como su <em>${escapeHtml(relation)}</em> de confianza
      en Tres Mil Millones de Latidos, la app que le ayuda a mantener claridad, avanzar en sus objetivos y gestionar su bienestar emocional.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      Con tu portal podrás ver su progreso (solo lo que él/ella elija compartir), enviarle mensajes de apoyo
      y ser alertado/a si necesita ayuda urgente.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6">
      <strong>Guarda este enlace — es tu acceso permanente:</strong>
    </p>`;
  const text = `Hola ${contactName},\n\n${userName} te ha añadido como contacto de confianza en Tres Mil Millones de Latidos.\n\nTu portal de acceso:\n${portalUrl}`;
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
