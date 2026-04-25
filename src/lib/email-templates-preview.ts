/**
 * Mock data + builder bindings para previsualizar plantillas de email
 * desde el panel admin sin disparar un envío real.
 *
 * Cada entrada en PREVIEW_REGISTRY recibe `appUrl` y `to` (para el envío
 * de prueba) y devuelve un `Pick<UserEmail, "subject" | "html" | "text">`.
 * Si una plantilla no tiene entrada aquí, el endpoint de preview devolverá
 * 404 con explicación.
 */

import type { UserEmail } from "@/lib/email";
import {
  buildVerificationEmail,
  buildWelcomeEmail,
  build24hNudgeEmail,
  build7dNudgeEmail,
  buildHeartbeatEmail,
  buildReminderEmail,
  buildWeeklyLetterNotificationEmail,
  buildSupportMessageEmail,
  buildCirclePulseOpenedEmail,
  buildMentorReflectionEmail,
  buildCircleClosingLetterEmail,
  buildFamilyInviteEmail,
  buildFamilyCrisisEmail,
  buildFamilyInactivityEmail,
  buildFamilyWinEmail,
} from "@/lib/email";

type PreviewOutput = Pick<UserEmail, "subject" | "html" | "text">;
type PreviewBuilder = (ctx: { appUrl: string; to: string }) => PreviewOutput;

const MOCK_NAME = "Mario";

export const PREVIEW_REGISTRY: Record<string, PreviewBuilder> = {
  verification: ({ appUrl, to }) =>
    buildVerificationEmail({
      to,
      verifyUrl: `${appUrl}/api/auth/verify-email?token=preview-token-1234`,
      name: MOCK_NAME,
    }),

  welcome: ({ appUrl }) =>
    buildWelcomeEmail({ name: MOCK_NAME, appUrl }),

  nudge_24h: ({ appUrl }) =>
    build24hNudgeEmail({ name: MOCK_NAME, appUrl }),

  nudge_7d: ({ appUrl }) =>
    build7dNudgeEmail({
      name: MOCK_NAME,
      lastUserPhrase: "todavía no encuentro las palabras para lo que siento",
      appUrl,
    }),

  heartbeat: ({ appUrl, to }) =>
    buildHeartbeatEmail({ to, beats: 250000, appUrl }),

  reminder: ({ appUrl }) =>
    buildReminderEmail({
      pendingAction: "Tu próxima reflexión semanal",
      appUrl,
    }),

  "weekly-letter-notification": ({ appUrl }) =>
    buildWeeklyLetterNotificationEmail({
      name: MOCK_NAME,
      letterId: "preview-letter-id",
      appUrl,
    }),

  support_message: ({ appUrl }) =>
    buildSupportMessageEmail({
      userEmail: "preview@example.com",
      fromName: "Una persona que te aprecia",
      content: "Solo quería decirte que sigo aquí. Cuando puedas, escríbeme.",
      appUrl,
    }),

  circle_pulse_opened: ({ appUrl }) =>
    buildCirclePulseOpenedEmail({
      name: MOCK_NAME,
      prompt: "¿Qué te ha sostenido esta semana cuando todo ha pesado más?",
      weekEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      appUrl,
    }),

  mentor_reflection_published: ({ appUrl }) =>
    buildMentorReflectionEmail({
      name: MOCK_NAME,
      prompt: "Lo que has compartido esta semana resonará contigo más tiempo del que crees.",
      appUrl,
    }),

  circle_closing_letter: ({ appUrl }) =>
    buildCircleClosingLetterEmail({
      name: MOCK_NAME,
      circleName: "Círculo de los miércoles",
      reason: "completed",
      body: "Gracias por estar. Lo que se sembró aquí no termina con el cierre del círculo.",
      appUrl,
    }),

  family_invite: ({ appUrl }) =>
    buildFamilyInviteEmail({
      userName: MOCK_NAME,
      contactName: "Lucía",
      relation: "pareja",
      portalUrl: `${appUrl}/family/preview-token`,
    }),

  family_crisis: ({ appUrl }) =>
    buildFamilyCrisisEmail({
      userName: MOCK_NAME,
      contactName: "Lucía",
      portalUrl: `${appUrl}/family/preview-token`,
      appBaseUrl: appUrl,
    }),

  family_inactivity: ({ appUrl }) =>
    buildFamilyInactivityEmail({
      userName: MOCK_NAME,
      contactName: "Lucía",
      daysSilent: 5,
      portalUrl: `${appUrl}/family/preview-token`,
    }),

  family_win: ({ appUrl }) =>
    buildFamilyWinEmail({
      userName: MOCK_NAME,
      contactName: "Lucía",
      winNote: "Hoy he conseguido salir a caminar 30 minutos sin que la cabeza me tirara hacia atrás.",
      portalUrl: `${appUrl}/family/preview-token`,
    }),
};

export function getPreviewableTemplateIds(): string[] {
  return Object.keys(PREVIEW_REGISTRY);
}

export function buildPreview(templateId: string, ctx: { appUrl: string; to: string }): PreviewOutput | null {
  const builder = PREVIEW_REGISTRY[templateId];
  if (!builder) return null;
  return builder(ctx);
}
