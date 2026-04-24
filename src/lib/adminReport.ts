// Helpers compartidos para /api/cron/admin-report.
// Cada "kind" del switch llama a estos para autenticarse y enviar el resumen
// al chat de Telegram del admin (ADMIN_TELEGRAM_ID).

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { logError } from "@/lib/logger";

const TELEGRAM_API = "https://api.telegram.org";

export type ReportSeverity = "ok" | "warn" | "alert" | "info";

export type Report = {
  kind: string;
  severity: ReportSeverity;
  title: string;
  lines: string[];
};

export function authorize(secretFromQuery: string | null): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  if (!secretFromQuery) return false;
  return secretFromQuery === expected;
}

function severityIcon(s: ReportSeverity): string {
  if (s === "ok") return "🟢";
  if (s === "warn") return "🟡";
  if (s === "alert") return "🔴";
  return "🔵";
}

function escapeMarkdown(value: string): string {
  // Telegram parse_mode "Markdown" (legacy) — escapamos lo justo.
  return value.replace(/([_*`\[])/g, "\\$1");
}

export function formatReport(report: Report): string {
  const icon = severityIcon(report.severity);
  const stamp = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
  const header = `${icon} *${escapeMarkdown(report.title)}*`;
  const body = report.lines.length > 0 ? report.lines.map((l) => `• ${l}`).join("\n") : "_(sin datos)_";
  return `${header}\n\n${body}\n\n_kind: \`${report.kind}\` · ${stamp}_`;
}

export async function sendAdminReport(report: Report): Promise<{ ok: boolean }> {
  const adminChatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN_ADMIN?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!adminChatId || !botToken) {
    logError("ADMIN_REPORT", new Error("Missing ADMIN_TELEGRAM_ID or TELEGRAM_BOT_TOKEN"), {
      kind: report.kind,
    });
    return { ok: false };
  }

  const text = formatReport(report);

  try {
    const response = await fetchWithTimeout(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logError("ADMIN_REPORT", new Error(`Telegram HTTP ${response.status}: ${detail.slice(0, 200)}`), {
        kind: report.kind,
      });
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    logError("ADMIN_REPORT", error, { kind: report.kind, area: "sendAdminReport" });
    return { ok: false };
  }
}

export function stubReport(kind: string, missing: string[], hint: string): Report {
  return {
    kind,
    severity: "warn",
    title: `Pendiente integrar: ${kind}`,
    lines: [
      `Faltan envs/credenciales: ${missing.join(", ") || "(ninguna)"}`,
      `Próximo paso: ${hint}`,
    ],
  };
}
