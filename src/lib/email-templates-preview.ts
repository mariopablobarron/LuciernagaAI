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
  buildPasswordResetEmail,
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
import { buildOnboardingPreviewEmail } from "@/services/onboarding-emails";
import { buildWeeklyInactiveReminderEmail } from "@/app/api/cron/weekly-inactive-reminder/route";
import { renderEmailHtml as renderAdminMessageHtml } from "@/app/api/admin/users/[id]/messages/route";

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

  password_reset: ({ appUrl, to }) =>
    buildPasswordResetEmail({
      to,
      resetUrl: `${appUrl}/reset-password?token=preview-reset-token-1234`,
      name: MOCK_NAME,
    }),

  onboarding_day1: () => buildOnboardingPreviewEmail("onboarding_day1", MOCK_NAME),
  onboarding_day3: () => buildOnboardingPreviewEmail("onboarding_day3", MOCK_NAME),
  onboarding_day7: () => buildOnboardingPreviewEmail("onboarding_day7", MOCK_NAME),
  quiz_followup_day3: () => buildOnboardingPreviewEmail("quiz_followup_day3", MOCK_NAME),

  weekly_inactive: () =>
    buildWeeklyInactiveReminderEmail({
      name: MOCK_NAME,
      daysSinceLastSeen: 9,
      lastGoalTitle: "Encontrar 30 minutos al día para escribir",
      streakDays: 5,
    }),

  admin_message: ({ appUrl }) => {
    const subject = "Una nota personal de tu mentor";
    const adminBody =
      "Mario, he estado revisando tu última semana y quería decirte algo en persona.\n\n" +
      "Lo que estás haciendo no es poco. Cinco días de seguimiento honesto cuando estás cansado vale más que veinte cuando todo va bien. Solo quería que lo supieras.\n\n" +
      "Cualquier cosa que necesites, escríbeme aquí mismo.";
    return {
      subject,
      html: renderAdminMessageHtml({
        subject,
        body: adminBody,
        openUrl: `${appUrl}/app/mensajes/preview-msg-id`,
      }),
      text: `${subject}\n\n${adminBody}\n\nAbrir en la app: ${appUrl}/app/mensajes/preview-msg-id`,
    };
  },

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
