import { logInfo } from "@/lib/logger";
import { notifyAdmin, sendTelegramNotification } from "@/services/telegram";
import { getPrismaClient } from "@/db/prisma";
import { createIntervention } from "./repository";
import type { SendInterventionInput } from "./types";

const TYPE_LABELS: Record<string, string> = {
  message: "Mensaje directo",
  recommendation: "Recomendación",
  resource: "Recurso",
  assessment: "Evaluación",
};

export async function sendIntervention(
  input: SendInterventionInput,
  adminId: string
): Promise<{ id: string }> {
  const { userId, type, content, notify = true } = input;

  // Validate user exists
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, telegramId: true, name: true, email: true },
  });
  if (!user) throw new Error(`USER_NOT_FOUND:${userId}`);

  // Persist intervention
  const intervention = await createIntervention({ userId, adminId, type, content });

  logInfo("CLINICAL", "intervention_sent", { interventionId: intervention.id, userId, adminId, type });

  // Fire-and-forget: send to user via Telegram if linked
  if (notify && user.telegramId) {
    const label = TYPE_LABELS[type] ?? type;
    const telegramText =
      `💬 *${label}* de tu equipo de apoyo:\n\n${content}`;
    sendTelegramNotification(user.telegramId, telegramText, "Markdown");
  }

  // Fire-and-forget: confirm to admin
  const displayName = user.name ?? user.email;
  notifyAdmin(
    `✅ *Intervención enviada*\n\n` +
    `👤 Usuario: \`${userId}\` (${displayName})\n` +
    `🏷 Tipo: ${TYPE_LABELS[type] ?? type}\n` +
    `💬 _${content.slice(0, 120)}${content.length > 120 ? "…" : ""}_`
  );

  return { id: intervention.id };
}
