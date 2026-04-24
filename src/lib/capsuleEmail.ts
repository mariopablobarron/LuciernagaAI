// Render del email "tu cápsula está lista". Sigue el patrón visual de los
// otros emails transaccionales (ver lib/email.ts para la implementación de envío).

import type { UserEmail } from "@/lib/email";

const APP_URL = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCapsuleReadyEmail(params: {
  to: string;
  userId: string;
  capsuleId: string;
  kind: "snapshot" | "letter";
}): UserEmail {
  const { to, userId, capsuleId, kind } = params;
  const url = `${APP_URL}/app/capsulas/${capsuleId}`;

  const subject =
    kind === "letter"
      ? "Te escribiste hace tiempo. La carta está lista."
      : "Esto eras hace 30 días.";

  const intro =
    kind === "letter"
      ? "Hace unas semanas te escribiste a ti misma. Hoy es el día que dijiste que la abrirías."
      : "Hace 30 días pasaste por aquí. El sistema guardó cómo estabas. Es solo para ti.";

  const cta = "Abrir";

  const text =
    `${intro}\n\n${url}\n\n` +
    `Si prefieres no recibir este aviso por email, puedes desactivarlo en Ajustes.\n` +
    `${APP_URL}/app/settings`;

  const safeIntro = escapeHtml(intro);
  const safeUrl = escapeHtml(url);
  const safeCta = escapeHtml(cta);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#d4d4d8">
  <div style="max-width:560px;margin:0 auto;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden">
    <div style="padding:32px">
      <p style="margin:0 0 24px;color:#a78bfa;font-size:13px;letter-spacing:0.04em;text-transform:uppercase">Cápsula lista</p>
      <p style="margin:0 0 28px;color:#e4e4e7;font-size:17px;line-height:1.6">${safeIntro}</p>
      <a href="${safeUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600">${safeCta}</a>
      <p style="margin:32px 0 0;color:#71717a;font-size:12px;line-height:1.6">
        Si prefieres no recibir este aviso por email, puedes desactivarlo en
        <a href="${APP_URL}/app/settings" style="color:#a78bfa;text-decoration:none">Ajustes</a>.
      </p>
    </div>
  </div>
</body>
</html>`;

  return {
    to,
    subject,
    html,
    text,
    userId,
    template: kind === "letter" ? "capsule_letter_ready" : "capsule_snapshot_ready",
  };
}
