import { logInfo, logWarn } from "@/lib/logger";
import { getPrismaClient } from "@/db/prisma";
import { answerCallbackQuery, editTelegramMessage } from "./telegram-utils";
import { triggerForceRedeploy } from "./coolify-api";
import { buildUserSearchMessage } from "./user-search";
import { buildCronLogsMessage, retryCronJob } from "./cron-watchdog";

export type CallbackContext = {
  callbackId: string;
  chatId: number;
  messageId: number;
  fromId: number;
  data: string;
  isAdmin: boolean;
};

const adminId = (): string | null => process.env.ADMIN_TELEGRAM_ID?.trim() || null;

const fmtNow = () =>
  new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });

/**
 * Router de callback_query del bot Telegram.
 * Formato de data: "<action>:<param1>[:<param2>]"
 * Acciones soportadas:
 *   - redeploy:confirm     → dispara Force Redeploy en Coolify
 *   - redeploy:cancel      → cancela
 *   - user:show:<userId>   → responde con ficha del usuario
 *   - crisis:ack:<userId>  → marca crisis como atendida (log + edit)
 */
export async function handleCallbackQuery(ctx: CallbackContext): Promise<void> {
  if (!ctx.isAdmin) {
    await answerCallbackQuery(ctx.callbackId, "⛔ No autorizado", true);
    return;
  }

  const [action, sub, ...rest] = ctx.data.split(":");

  if (action === "redeploy") {
    if (sub === "cancel") {
      await editTelegramMessage(ctx.chatId, ctx.messageId, `❌ Redeploy cancelado.\n_${fmtNow()}_`);
      await answerCallbackQuery(ctx.callbackId, "Cancelado");
      return;
    }
    if (sub === "confirm") {
      await answerCallbackQuery(ctx.callbackId, "Disparando…");
      await editTelegramMessage(ctx.chatId, ctx.messageId, `⏳ Disparando Force Redeploy…\n_${fmtNow()}_`);
      const result = await triggerForceRedeploy();
      if (result.ok) {
        await editTelegramMessage(
          ctx.chatId,
          ctx.messageId,
          [
            `🚀 *Force Redeploy disparado*`,
            "",
            result.deploymentId ? `Deployment ID: \`${result.deploymentId}\`` : "Deployment encolado.",
            `_${fmtNow()}_`,
            "",
            `Sigue el progreso: http://72.61.195.108:3000/applications/cmnc4qjph0006p2a3ggmfdflz/logs/build`,
          ].join("\n")
        );
      } else {
        await editTelegramMessage(
          ctx.chatId,
          ctx.messageId,
          `❌ *No se pudo disparar el redeploy*\n\n${result.error}`
        );
      }
      logInfo("CALLBACK", "redeploy", { ok: result.ok });
      return;
    }
  }

  if (action === "user" && sub === "show" && rest[0]) {
    await answerCallbackQuery(ctx.callbackId, "Buscando…");
    const reply = await buildUserSearchMessage(rest[0]);
    await editTelegramMessage(ctx.chatId, ctx.messageId, reply);
    return;
  }

  if (action === "cron" && sub === "logs" && rest[0]) {
    await answerCallbackQuery(ctx.callbackId, "Cargando…");
    const reply = await buildCronLogsMessage(rest[0]);
    await editTelegramMessage(ctx.chatId, ctx.messageId, reply);
    return;
  }

  if (action === "cron" && sub === "retry" && rest[0]) {
    const jobName = rest[0];
    await answerCallbackQuery(ctx.callbackId, "Reintentando…");
    await editTelegramMessage(ctx.chatId, ctx.messageId, `🔄 Reintentando \`${jobName}\`…\n_${fmtNow()}_`);
    const result = await retryCronJob(jobName);
    if (result.ok) {
      await editTelegramMessage(
        ctx.chatId,
        ctx.messageId,
        [
          `✅ *Reintento OK*: \`${jobName}\``,
          "",
          `HTTP ${result.httpStatus}`,
          result.bodyPreview ? `\n\`\`\`\n${result.bodyPreview}\n\`\`\`` : "",
          `_${fmtNow()}_`,
        ].join("\n")
      );
    } else {
      await editTelegramMessage(
        ctx.chatId,
        ctx.messageId,
        `❌ *Reintento falló*: \`${jobName}\`\n\nHTTP ${result.httpStatus ?? "—"}\n${result.error ?? result.bodyPreview ?? ""}\n_${fmtNow()}_`
      );
    }
    logInfo("CALLBACK", "cron_retry", { jobName, ok: result.ok });
    return;
  }

  if (action === "crisis" && sub === "ack" && rest[0]) {
    const userId = rest[0];
    const adminTgId = ctx.fromId;
    try {
      const prisma = getPrismaClient();
      await prisma.systemLog
        .create({
          data: {
            level: "info",
            tag: "CRISIS_ACK",
            message: `Crisis acknowledged from Telegram by admin ${adminTgId}`,
            userId,
            context: { adminTgId, chatId: ctx.chatId, messageId: ctx.messageId },
          },
        })
        .catch(() => null);
    } catch {
      // best-effort log
    }
    await editTelegramMessage(
      ctx.chatId,
      ctx.messageId,
      `✅ *Crisis marcada como atendida*\nUsuario: \`${userId}\`\nAdmin: \`${adminTgId}\`\n_${fmtNow()}_\n\n_Sin cambios en UserState — usar el panel admin para acciones de seguimiento._`
    );
    await answerCallbackQuery(ctx.callbackId, "Marcado ✓");
    return;
  }

  logWarn("CALLBACK", "unknown_action", { action, sub, data: ctx.data });
  await answerCallbackQuery(ctx.callbackId, "Acción desconocida", true);
}

export function isAdminFrom(fromId: number | string | undefined): boolean {
  const a = adminId();
  return !!a && String(fromId) === a;
}
