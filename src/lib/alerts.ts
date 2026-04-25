// Sistema de alertas para Telegram y Email

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { logError, logWarn } from "@/lib/logger";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface Alert {
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  metric?: string;
  value?: number;
}

const AUTOMATED_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

const globalForAlerts = globalThis as {
  automatedAlerts?: Map<string, number>;
};

function getAutomatedAlertsCache(): Map<string, number> {
  if (!globalForAlerts.automatedAlerts) {
    globalForAlerts.automatedAlerts = new Map<string, number>();
  }

  return globalForAlerts.automatedAlerts;
}

function truncateText(value: string, maxLength = 140): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function reserveAutomatedAlert(key: string, cooldownMs = AUTOMATED_ALERT_COOLDOWN_MS): boolean {
  const cache = getAutomatedAlertsCache();
  const now = Date.now();

  for (const [cacheKey, timestamp] of cache.entries()) {
    if (now - timestamp >= cooldownMs) {
      cache.delete(cacheKey);
    }
  }

  const previousTimestamp = cache.get(key);
  if (previousTimestamp && now - previousTimestamp < cooldownMs) {
    return false;
  }

  cache.set(key, now);
  return true;
}

async function sendTelegram(alert: Alert): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN_ADMIN?.trim() || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    logWarn("ALERTS", "Telegram credentials missing, skipping alert");
    return;
  }

  const bar = alert.type === "critical" ? "🔴🔴🔴🔴🔴" : alert.type === "warning" ? "🟠🟠🟠🟠🟠" : "🔵🔵🔵🔵🔵";
  const message = `${bar} ${alert.type.toUpperCase()} ${bar}\n\n*${alert.title}*\n\n${alert.message}${
    alert.metric ? `\n\n📊 ${alert.metric}: ${alert.value}` : ""
  }\n\n🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      logError("ALERTS", new Error(`Telegram HTTP ${response.status}: ${await response.text().catch(() => "")}`));
    }
  } catch (error) {
    logError("ALERTS", error, { area: "sendTelegram" });
  }
}

async function sendEmail(alert: Alert): Promise<void> {
  const toEmail = process.env.ALERT_EMAIL;
  if (!toEmail) return;

  // Use Resend (same as transactional emails)
  const { sendUserEmail } = await import("@/lib/email");

  const emoji = alert.type === "critical" ? "🚨" : alert.type === "warning" ? "⚠️" : "ℹ️";
  const subject = `${emoji} ${alert.type.toUpperCase()} — ${alert.title}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:system-ui,sans-serif;color:#d4d4d8">
  <div style="max-width:560px;margin:0 auto;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden">
    <div style="background:${alert.type === "critical" ? "#dc2626" : alert.type === "warning" ? "#d97706" : "#7c3aed"};padding:20px 32px">
      <span style="color:#fff;font-size:16px;font-weight:700">${emoji} ${escapeHtml(alert.title)}</span>
    </div>
    <div style="padding:24px 32px">
      <p style="margin:0 0 16px;color:#e4e4e7;font-size:15px;line-height:1.6">${escapeHtml(alert.message)}</p>
      ${alert.metric ? `<p style="margin:0;color:#71717a;font-size:13px"><strong>${escapeHtml(alert.metric)}:</strong> ${alert.value}</p>` : ""}
    </div>
    <div style="padding:12px 32px;border-top:1px solid #27272a">
      <p style="margin:0;font-size:11px;color:#52525b">Tres Mil Millones de Latidos — Sistema de alertas</p>
    </div>
  </div>
</body>
</html>`;

  const text = `${alert.title}\n\n${alert.message}${alert.metric ? `\n\n${alert.metric}: ${alert.value}` : ""}`;

  await sendUserEmail({ to: toEmail, subject, html, text }).catch((err) =>
    logError("ALERTS", err, { area: "sendEmail_resend" })
  );
}

export async function sendAlert(alert: Alert): Promise<void> {
  // Enviar a ambos canales
  await Promise.all([sendTelegram(alert), sendEmail(alert)]);
}

export async function sendAutomatedAlert(
  alert: Alert,
  options?: {
    dedupeKey?: string;
    cooldownMs?: number;
  }
): Promise<boolean> {
  const dedupeKey =
    options?.dedupeKey ??
    [alert.type, alert.title, alert.metric ?? "none", alert.value ?? 0].join(":");

  const shouldDispatch = reserveAutomatedAlert(
    dedupeKey,
    options?.cooldownMs ?? AUTOMATED_ALERT_COOLDOWN_MS
  );

  if (!shouldDispatch) {
    return false;
  }

  await sendAlert(alert);
  return true;
}

export async function dispatchAutomatedAlerts(
  alerts: Alert[],
  cooldownMs = AUTOMATED_ALERT_COOLDOWN_MS
): Promise<number> {
  let dispatched = 0;

  for (const alert of alerts) {
    const sent = await sendAutomatedAlert(alert, {
      dedupeKey: `batch:${alert.type}:${alert.title}`,
      cooldownMs,
    });

    if (sent) {
      dispatched += 1;
    }
  }

  return dispatched;
}

export async function sendCrisisEscalationAlert(params: {
  userId: string;
  level: "high" | "critical";
  message: string;
}): Promise<boolean> {
  return sendAutomatedAlert(
    {
      type: "critical",
      title:
        params.level === "critical"
          ? "CRISIS crítica detectada en conversación"
          : "Crisis alta detectada en conversación",
      message: `Usuario ${params.userId}. Mensaje: ${truncateText(params.message)}`,
      metric: "crisisLevel",
      value: params.level === "critical" ? 2 : 1,
    },
    {
      dedupeKey: `crisis:${params.userId}:${params.level}`,
      cooldownMs: 15 * 60 * 1000,
    }
  );
}

export async function sendAvoidanceEscalationAlert(params: {
  userId: string;
  type: "postpone" | "refuse" | "avoidance";
  count: number;
  actionTitle: string;
  goalTitle?: string | null;
}): Promise<boolean> {
  if (params.type !== "refuse" && params.count < 2) {
    return false;
  }

  return sendAutomatedAlert(
    {
      type: params.type === "refuse" ? "critical" : "warning",
      title:
        params.type === "refuse"
          ? "Rechazo explícito de acción clave"
          : params.type === "avoidance"
            ? "Desvio repetido de accion pendiente"
            : "Evitación repetida de acción pendiente",
      message:
        `Usuario ${params.userId}. Acción: ${params.actionTitle}. ` +
        `${params.goalTitle ? `Objetivo: ${params.goalTitle}. ` : ""}` +
        `Eventos acumulados: ${params.count}.`,
      metric: "avoidanceCount",
      value: params.count,
    },
    {
      dedupeKey: `avoidance:${params.userId}:${params.actionTitle}:${params.type}`,
      cooldownMs: 20 * 60 * 1000,
    }
  );
}

export async function sendAdminUserAlert(params: {
  userId: string;
  lastMessage: string;
  state?: string;
  reason?: string;
}): Promise<void> {
  const adminChatId = process.env.ADMIN_TELEGRAM_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN_ADMIN?.trim() || process.env.TELEGRAM_BOT_TOKEN;
  if (!adminChatId || !botToken) {
    logError("ALERTS", new Error("ADMIN_TELEGRAM_ID or TELEGRAM_BOT_TOKEN not configured for admin alerts"), {
      area: "sendAdminUserAlert",
      userId: params.userId,
    });
    return;
  }

  const isCritical = params.state === "riesgo" || params.state === "ansiedad";
  const bar = isCritical ? "🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴" : "🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠";
  const via = params.userId.startsWith("tg_") ? "Telegram" : "App web";

  const text =
    `${bar}\n` +
    `⚠️ *USUARIO REQUIERE ATENCIÓN*\n` +
    `${bar}\n\n` +
    `👤 ID: \`${params.userId}\`\n` +
    (params.state ? `🧠 Estado: *${params.state.toUpperCase()}*\n` : "") +
    (params.reason ? `📌 Motivo: ${params.reason}\n` : "") +
    `💬 _"${truncateText(params.lastMessage)}"_\n\n` +
    `_Vía: ${via}_\n` +
    `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`;

  try {
    await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "👁 Ver usuario", callback_data: `user:show:${params.userId}` },
              { text: "✅ Marcar atendido", callback_data: `crisis:ack:${params.userId}` },
            ],
          ],
        },
      }),
    });
  } catch (error) {
    logError("ALERTS", error, { area: "sendAdminUserAlert" });
  }
}

export async function checkAndAlert(metrics: {
  retentionDay3: number;
  checkinDrop: number;
  dominantState: string;
}): Promise<void> {
  // Crisis de retención
  if (metrics.retentionDay3 < 0.3) {
    await sendAutomatedAlert({
      type: "critical",
      title: "CRISIS: Retención crítica en día 3",
      message: "Solo el 30% de usuarios vuelven en día 3. Necesitas intervención inmediata.",
      metric: "retentionDay3",
      value: metrics.retentionDay3,
    });
  }

  // Abandono alto en check-ins
  if (metrics.checkinDrop > 0.7) {
    await sendAutomatedAlert({
      type: "critical",
      title: "ALERTA: 70% abandono en check-ins",
      message: "El check-in es demasiado complejo. Usuarios abandonan antes de terminar.",
      metric: "checkinDrop",
      value: metrics.checkinDrop,
    });
  }

  // Mayoría bloqueados
  if (metrics.dominantState === "bloqueo") {
    await sendAutomatedAlert({
      type: "warning",
      title: "Usuarios principalmente en bloqueo",
      message: "La mayoría de usuarios reportan parálisis o bloqueo mental.",
      metric: "dominantState",
      value: 1,
    });
  }

  // Warning en retención día 3
  if (metrics.retentionDay3 < 0.4 && metrics.retentionDay3 >= 0.3) {
    await sendAutomatedAlert({
      type: "warning",
      title: "Retención baja en día 3",
      message: "Retención < 40%. Considera simplificar el onboarding.",
      metric: "retentionDay3",
      value: metrics.retentionDay3,
    });
  }
}
