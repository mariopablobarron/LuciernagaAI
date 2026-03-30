// Transactional email sending for user-facing messages

const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

function getEmailConfig(): { apiKey: string; from: string } | null {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  const apiKey = process.env.EMAIL_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ?? `Luciérnaga <noreply@luciernaga.ai>`;

  if (provider !== "sendgrid" || !apiKey) return null;
  return { apiKey, from };
}

export type UserEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendUserEmail(email: UserEmail): Promise<boolean> {
  const config = getEmailConfig();
  if (!config) return false;

  try {
    const res = await fetch(SENDGRID_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: { email: config.from },
        subject: email.subject,
        content: [
          { type: "text/plain", value: email.text },
          { type: "text/html", value: email.html },
        ],
      }),
    });

    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}

export function buildReminderEmail(params: {
  pendingAction: string;
  appUrl: string;
}): Pick<UserEmail, "subject" | "html" | "text"> {
  const { pendingAction, appUrl } = params;

  const subject = "Tienes una acción pendiente en Luciérnaga";

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
            <span style="color:#f5c518;font-size:20px;font-weight:700;letter-spacing:-0.5px">Luciérnaga</span>
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
              Luciérnaga acompaña — no obliga. Si no es el momento, está bien.<br>
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
