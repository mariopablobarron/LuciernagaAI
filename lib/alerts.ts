// Sistema de alertas para Telegram y Email

interface Alert {
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  metric?: string;
  value?: number;
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
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

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

export async function checkAndAlert(metrics: {
  retentionDay3: number;
  checkinDrop: number;
  dominantState: string;
}): Promise<void> {
  // Crisis de retención
  if (metrics.retentionDay3 < 0.3) {
    await sendAlert({
      type: "critical",
      title: "CRISIS: Retención crítica en día 3",
      message:
        "Solo el 30% de usuarios vuelven en día 3. Necesitas intervención inmediata.",
      metric: "retentionDay3",
      value: metrics.retentionDay3,
    });
  }

  // Abandono alto en check-ins
  if (metrics.checkinDrop > 0.7) {
    await sendAlert({
      type: "critical",
      title: "ALERTA: 70% abandono en check-ins",
      message: "El check-in es demasiado complejo. Usuarios abandonan antes de terminar.",
      metric: "checkinDrop",
      value: metrics.checkinDrop,
    });
  }

  // Mayoría bloqueados
  if (metrics.dominantState === "bloqueado") {
    await sendAlert({
      type: "warning",
      title: "Usuarios principalmente bloqueados",
      message: "La mayoría de usuarios reportan parálisis o bloqueo mental.",
      metric: "dominantState",
      value: 1,
    });
  }

  // Warning en retención día 3
  if (metrics.retentionDay3 < 0.4 && metrics.retentionDay3 >= 0.3) {
    await sendAlert({
      type: "warning",
      title: "Retención baja en día 3",
      message: "Retención < 40%. Considera simplificar el onboarding.",
      metric: "retentionDay3",
      value: metrics.retentionDay3,
    });
  }
}
