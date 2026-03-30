// Sistema de alertas para Telegram y Email

export interface Alert {
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  metric?: string;
  value?: number;
}

const AUTOMATED_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

const globalForAlerts = globalThis as {
  luciernagaAutomatedAlerts?: Map<string, number>;
};

function getAutomatedAlertsCache(): Map<string, number> {
  if (!globalForAlerts.luciernagaAutomatedAlerts) {
    globalForAlerts.luciernagaAutomatedAlerts = new Map<string, number>();
  }

  return globalForAlerts.luciernagaAutomatedAlerts;
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
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials missing, skipping alert");
    return;
  }

  const emoji = alert.type === "critical" ? "🚨" : alert.type === "warning" ? "⚠️" : "ℹ️";
  const message = `${emoji} *${alert.title}*\n\n${alert.message}${
    alert.metric ? `\n\n📊 ${alert.metric}: ${alert.value}` : ""
  }`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
      console.error("Telegram error:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send Telegram alert:", error);
  }
}

async function sendEmail(alert: Alert): Promise<void> {
  const emailProvider = process.env.EMAIL_PROVIDER; // sendgrid, mailgun, etc.
  const apiKey = process.env.EMAIL_API_KEY;
  const toEmail = process.env.ALERT_EMAIL;

  if (!emailProvider || !apiKey || !toEmail) {
    console.warn("Email credentials missing, skipping alert");
    return;
  }

  const subject = `${alert.type.toUpperCase()} - ${alert.title}`;
  const htmlContent = `
    <h2>${alert.title}</h2>
    <p>${alert.message}</p>
    ${alert.metric ? `<p><strong>${alert.metric}:</strong> ${alert.value}</p>` : ""}
    <hr>
    <p>Luciérnaga Decision Engine</p>
  `;

  if (emailProvider === "sendgrid") {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: "noreply@luciernaga.ai" },
          subject,
          content: [{ type: "text/html", value: htmlContent }],
        }),
      });
    } catch (error) {
      console.error("SendGrid error:", error);
    }
  }
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
