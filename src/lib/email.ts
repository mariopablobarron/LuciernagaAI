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

// ─── Heartbeat Calculator Email ──────────────────────────────────────────────

const AVG_BPM = 72;
const BEATS_PER_HOUR = AVG_BPM * 60;
const BEATS_PER_DAY = BEATS_PER_HOUR * 24;

function fmtBeats(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} mil millones`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} millones`;
  return n.toLocaleString("es-ES");
}

export function buildHeartbeatEmail(params: {
  to: string;
  beats: number;
  appUrl: string;
}): UserEmail {
  const { to, beats, appUrl } = params;
  const days = Math.round(beats / BEATS_PER_DAY);
  const hours = Math.round(beats / BEATS_PER_HOUR);
  const songs = Math.round(beats / (AVG_BPM * 3.5));
  const hugs = Math.round(beats / (AVG_BPM * 0.33));

  const subject = `💓 ${fmtBeats(beats)} latidos — tu informe personal`;

  const text = [
    `Tu informe de latidos`,
    ``,
    `Tu corazon ha latido aproximadamente ${fmtBeats(beats)} veces para traerte hasta aqui.`,
    ``,
    `Eso equivale a:`,
    `- ${days.toLocaleString("es-ES")} amaneceres vividos`,
    `- ${hours.toLocaleString("es-ES")} horas de experiencia acumulada`,
    `- ${songs.toLocaleString("es-ES")} canciones que cabrian en ese tiempo`,
    `- ${hugs.toLocaleString("es-ES")} abrazos posibles`,
    ``,
    `Cada latido sostuvo una decision, un momento de duda, un paso adelante.`,
    `No son numeros — son tu historia.`,
    ``,
    `Lo que puedes hacer ahora:`,
    `Tu corazon ya tiene la constancia. Solo falta que tu le des una direccion.`,
    `El primer paso no tiene que ser grande — solo tiene que ser tuyo.`,
    ``,
    `Dar mi primer paso: ${appUrl}/app`,
    ``,
    `---`,
    ``,
    `Convierte intencion en accion con Tres Mil Millones de Latidos:`,
    `Un mentor con IA, check-ins diarios, objetivos y retos de 21 dias.`,
    ``,
    `Crear cuenta gratis: ${appUrl}/signup?utm_source=calculator&utm_medium=email&utm_campaign=heartbeat_report`,
    `Ya tienes cuenta? ${appUrl}/login`,
    ``,
    `— Tres Mil Millones de Latidos`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:28px 32px">
          <p style="margin:0;font-size:22px;font-weight:800;color:#fff">💓 Tu informe de latidos</p>
          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">Un recuento de todo lo que ya has vivido</p>
        </td></tr>

        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.15em;font-weight:600">Latidos acumulados</p>
          <p style="margin:0 0 24px;font-size:36px;font-weight:800;background:linear-gradient(135deg,#c084fc,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${fmtBeats(beats)}</p>

          <p style="margin:0 0 20px;font-size:15px;color:#a1a1aa;line-height:1.6">
            Tu corazon ha latido <strong style="color:#e4e4e7">${fmtBeats(beats)} veces</strong> para traerte hasta aqui.
            Cada uno sostuvo una decision, un momento de duda, un paso adelante.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr>
              <td width="50%" style="padding:8px">
                <div style="background:#7c3aed10;border:1px solid #7c3aed30;border-radius:10px;padding:16px;text-align:center">
                  <p style="margin:0;font-size:24px;font-weight:700;color:#c4b5fd">${days.toLocaleString("es-ES")}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#71717a">amaneceres vividos</p>
                </div>
              </td>
              <td width="50%" style="padding:8px">
                <div style="background:#ec489910;border:1px solid #ec489930;border-radius:10px;padding:16px;text-align:center">
                  <p style="margin:0;font-size:24px;font-weight:700;color:#f9a8d4">${songs.toLocaleString("es-ES")}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#71717a">canciones que cabrian</p>
                </div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding:8px">
                <div style="background:#06b6d410;border:1px solid #06b6d430;border-radius:10px;padding:16px;text-align:center">
                  <p style="margin:0;font-size:24px;font-weight:700;color:#67e8f9">${hours.toLocaleString("es-ES")}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#71717a">horas de experiencia</p>
                </div>
              </td>
              <td width="50%" style="padding:8px">
                <div style="background:#10b98110;border:1px solid #10b98130;border-radius:10px;padding:16px;text-align:center">
                  <p style="margin:0;font-size:24px;font-weight:700;color:#6ee7b7">${hugs.toLocaleString("es-ES")}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#71717a">abrazos posibles</p>
                </div>
              </td>
            </tr>
          </table>

          <div style="background:#27272a;border-radius:10px;padding:20px;margin:0 0 24px">
            <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#fff">No son numeros — son tu historia</p>
            <p style="margin:0 0 8px;font-size:14px;color:#a1a1aa;line-height:1.6">
              Detras de cada latido hubo decisiones que tomaste, miedos que enfrentaste y dias que simplemente aguantaste.
              Eso es fuerza real — no la del gimnasio, sino la que sostiene todo lo demas.
            </p>
            <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6">
              Tu corazon tiene la constancia. Solo falta que tu le des una direccion.
            </p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;color:#e4e4e7;font-weight:600">El primer paso no tiene que ser grande — solo tiene que ser tuyo.</p>

          <a href="${appUrl}/app" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px">Dar mi primer paso</a>
        </td></tr>

        <!-- Marketing block -->
        <tr><td style="padding:0 32px 32px;border-top:1px solid #27272a">
          <div style="margin-top:24px;background:#0a0a0a;border:1px solid #27272a;border-radius:10px;padding:24px;text-align:center">
            <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#fff">Convierte intencion en accion</p>
            <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa;line-height:1.5">
              Un mentor con IA que detecta tu estado emocional y te guia a pasos concretos.<br>
              Objetivos, check-ins diarios, retos de 21 dias y seguimiento continuo.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
              <tr>
                <td style="padding:4px 8px;text-align:center">
                  <p style="margin:0;font-size:11px;color:#71717a">Chat con IA</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#c4b5fd;font-weight:600">Ilimitado</p>
                </td>
                <td style="padding:4px 8px;text-align:center">
                  <p style="margin:0;font-size:11px;color:#71717a">Check-in diario</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#c4b5fd;font-weight:600">30 seg</p>
                </td>
                <td style="padding:4px 8px;text-align:center">
                  <p style="margin:0;font-size:11px;color:#71717a">Modo Impulso</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#c4b5fd;font-weight:600">21 dias</p>
                </td>
              </tr>
            </table>
            <a href="${appUrl}/signup?utm_source=calculator&utm_medium=email&utm_campaign=heartbeat_report" style="display:inline-block;padding:12px 28px;background:#fff;color:#18181b;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px">Crear cuenta gratis</a>
            <p style="margin:12px 0 0;font-size:11px;color:#52525b">
              Ya tienes cuenta? <a href="${appUrl}/login" style="color:#c4b5fd;text-decoration:underline">Inicia sesion</a>
            </p>
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 24px">
          <p style="margin:0;font-size:11px;color:#52525b;line-height:1.5">
            Tres Mil Millones de Latidos — mentoria conversacional con IA.<br>
            Este informe se genero desde la calculadora de latidos.
          </p>
        </td></tr>
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

export async function sendUserEmail(email: UserEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "TresMilMillonesdeLatidos <info@tresmilmillonesdelatidos.es>";
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

  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email.to)}`;

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
  const firstName = name ? escapeHtml(name.trim().split(/\s+/)[0]) : null;
  const greeting = firstName ? `${firstName}` : "Hola";

  const subject = firstName
    ? `${firstName}, tu primer latido empieza aquí`
    : "Tu primer latido empieza aquí";

  const text = [
    `${greeting},`,
    ``,
    `Has dado el primer paso. La mayoría no llega aquí.`,
    ``,
    `Tres Mil Millones de Latidos no es una app que te dice qué hacer. Es un espacio que te pregunta lo que nadie te pregunta — para que veas lo que no estás viendo.`,
    ``,
    `No necesitas tenerlo claro. Solo necesitas empezar por lo que sientes hoy.`,
    ``,
    `Tu primer paso: entra y cuéntame cómo estás.`,
    `${appUrl}/app`,
    ``,
    `Cada latido cuenta. Y este es el primero.`,
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
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700">${greeting},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Has dado el primer paso. La mayoría no llega aquí.
            </p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Esto no es una app que te dice qué hacer. Es un espacio que te pregunta lo que nadie
              te pregunta — para que veas lo que no estás viendo.
            </p>
            <div style="background:#27272a;border-left:3px solid #d946ef;border-radius:4px;padding:16px 20px;margin:24px 0">
              <p style="margin:0;font-size:16px;color:#e4e4e7;line-height:1.6">
                No necesitas tenerlo claro.<br>
                Solo necesitas empezar por lo que sientes hoy.
              </p>
            </div>
            <div style="text-align:center;margin:28px 0">
              <a href="${appUrl}/app" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Mi primer latido
              </a>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#71717a;text-align:center">
              Cada latido cuenta. Y este es el primero.
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
            <p style="margin:0 0 20px;font-size:20px;color:#fff;font-weight:700">${greeting},</p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Ayer diste un paso. Hoy toca el segundo.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#a1a1aa">
              No necesitas una hora. No necesitas tenerlo claro. Solo necesitas escribir una frase
              sobre cómo estás ahora mismo.
            </p>
            <div style="text-align:center;margin:24px 0">
              <a href="${appUrl}/app" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Segundo latido
              </a>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#71717a;text-align:center;font-style:italic">
              A veces volver es solo abrir la puerta y decir "hoy estoy así".
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              No sustituye terapia profesional. <a href="${appUrl}/settings" style="color:#71717a">Dejar de recibir estos emails</a>
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
