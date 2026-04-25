/**
 * Catálogo de plantillas de email del sistema.
 *
 * Cada entrada describe una plantilla que la app envía (manual o automático)
 * y se usa en el panel admin de marketing para visibilidad.
 *
 * El campo `id` debe coincidir con el `template` que se pasa a `sendUserEmail`,
 * así el histórico de EmailLog se cruza correctamente.
 */

export type EmailTemplateCategory = "auth" | "onboarding" | "engagement" | "lifecycle" | "circles" | "admin";

export type EmailTemplateMeta = {
  id: string;
  name: string;
  description: string;
  category: EmailTemplateCategory;
  trigger: string;
  builderFn?: string;
};

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  // Auth
  {
    id: "verification",
    name: "Verificación de email",
    description: "Link para verificar la dirección de email tras el registro.",
    category: "auth",
    trigger: "Al registrarse o pedir reenvío de verificación.",
    builderFn: "buildVerificationEmail",
  },
  {
    id: "welcome",
    name: "Bienvenida",
    description: "Mensaje cálido tras verificar el email.",
    category: "auth",
    trigger: "Al verificar email correctamente.",
    builderFn: "buildWelcomeEmail",
  },
  {
    id: "password_reset",
    name: "Recuperar contraseña",
    description: "Link para resetear la contraseña.",
    category: "auth",
    trigger: "Al solicitar 'olvidé mi contraseña'.",
  },

  // Onboarding
  {
    id: "onboarding_day1",
    name: "Onboarding · día 1",
    description: "Primer empujón 30 min después del signup.",
    category: "onboarding",
    trigger: "30 minutos tras el signup.",
  },
  {
    id: "onboarding_day3",
    name: "Onboarding · día 3",
    description: "Reactivación crítica en el día 3.",
    category: "onboarding",
    trigger: "Día 3 tras signup, si sigue inactivo.",
  },
  {
    id: "onboarding_day7",
    name: "Onboarding · día 7",
    description: "Cierre suave de la primera semana.",
    category: "onboarding",
    trigger: "Día 7 tras signup.",
  },
  {
    id: "quiz_followup_day3",
    name: "Quiz follow-up · día 3",
    description: "Seguimiento si hizo quiz pero no completó signup.",
    category: "onboarding",
    trigger: "Día 3 tras quiz, si no se registró.",
  },

  // Engagement (nudges)
  {
    id: "nudge_24h",
    name: "Nudge 24h",
    description: "Vuelve si no ha entrado en 24 horas.",
    category: "engagement",
    trigger: "Cron diario, usuarios inactivos 24h.",
    builderFn: "build24hNudgeEmail",
  },
  {
    id: "nudge_7d",
    name: "Nudge 7d",
    description: "Recordatorio tras 7 días sin actividad.",
    category: "engagement",
    trigger: "Cron diario, usuarios inactivos 7d.",
    builderFn: "build7dNudgeEmail",
  },
  {
    id: "weekly_inactive",
    name: "Recordatorio semanal · inactivos",
    description: "Resumen semanal a usuarios inactivos.",
    category: "engagement",
    trigger: "Cron weekly-inactive-reminder.",
  },

  // Lifecycle
  {
    id: "weekly-letter-notification",
    name: "Carta semanal lista",
    description: "Aviso de que la carta semanal del mentor está lista.",
    category: "lifecycle",
    trigger: "Cron weekly-letter al publicar.",
    builderFn: "buildWeeklyLetterNotificationEmail",
  },
  {
    id: "heartbeat",
    name: "Latido (heartbeat)",
    description: "Resumen visual de progreso emocional.",
    category: "lifecycle",
    trigger: "Triggers narrativos de la app.",
    builderFn: "buildHeartbeatEmail",
  },
  {
    id: "reminder",
    name: "Recordatorio genérico",
    description: "Recordatorio de acción pendiente.",
    category: "lifecycle",
    trigger: "Servicios de reminders.",
    builderFn: "buildReminderEmail",
  },

  // Circles
  {
    id: "circle_pulse_opened",
    name: "Pulso de círculo abierto",
    description: "Aviso cuando se abre un nuevo pulso en el círculo.",
    category: "circles",
    trigger: "Servicio circlePulses al abrir pulso.",
    builderFn: "buildCirclePulseOpenedEmail",
  },
  {
    id: "circle_closing_letter",
    name: "Carta de cierre del círculo",
    description: "Mensaje de cierre cuando termina un círculo.",
    category: "circles",
    trigger: "Servicio circleMatchmaking al cerrar círculo.",
    builderFn: "buildCircleClosingLetterEmail",
  },
  {
    id: "mentor_reflection_published",
    name: "Reflexión del mentor publicada",
    description: "Aviso de que el mentor ha publicado su reflexión.",
    category: "circles",
    trigger: "Endpoint admin de reflexiones al publicar.",
    builderFn: "buildMentorReflectionEmail",
  },

  // Admin / familia
  {
    id: "admin_message",
    name: "Mensaje admin manual",
    description: "Mensaje individual enviado desde la ficha de usuario.",
    category: "admin",
    trigger: "Botón 'Enviar email' en /admin/users/[id].",
  },
  {
    id: "family_invite",
    name: "Familia · invitación",
    description: "Invitación a un familiar para unirse al círculo de apoyo.",
    category: "admin",
    trigger: "Flujo de invitación familiar.",
    builderFn: "buildFamilyInviteEmail",
  },
  {
    id: "family_crisis",
    name: "Familia · alerta crisis",
    description: "Aviso a la familia ante señales de crisis.",
    category: "admin",
    trigger: "Detección de señales de crisis.",
    builderFn: "buildFamilyCrisisEmail",
  },
  {
    id: "family_inactivity",
    name: "Familia · inactividad",
    description: "Aviso a la familia tras periodo de inactividad.",
    category: "admin",
    trigger: "Detección de inactividad prolongada.",
    builderFn: "buildFamilyInactivityEmail",
  },
  {
    id: "family_win",
    name: "Familia · logro",
    description: "Comparte un logro con la familia.",
    category: "admin",
    trigger: "Hitos del usuario.",
    builderFn: "buildFamilyWinEmail",
  },
  {
    id: "support_message",
    name: "Mensaje de soporte",
    description: "Respuesta de soporte a un mensaje del usuario.",
    category: "admin",
    trigger: "Respuesta admin desde panel de soporte.",
    builderFn: "buildSupportMessageEmail",
  },
  {
    id: "waitlist_welcome",
    name: "Waitlist · bienvenida",
    description: "Confirmación de inscripción a la lista de espera.",
    category: "lifecycle",
    trigger: "Al apuntarse desde el formulario público de waitlist.",
    builderFn: "buildWaitlistWelcomeEmail",
  },
  {
    id: "quiz_lead",
    name: "Quiz · diagnóstico",
    description: "Resultado del test público con la acción concreta para hoy.",
    category: "lifecycle",
    trigger: "Al completar el test desde la página /test.",
    builderFn: "buildQuizLeadEmail",
  },
  {
    id: "admin_alert",
    name: "Alerta operativa al admin",
    description: "Aviso interno por email cuando salta una alerta crítica.",
    category: "admin",
    trigger: "Servicio de alertas (lib/alerts.ts) sobre eventos críticos.",
  },
];

export const EMAIL_TEMPLATE_BY_ID: Record<string, EmailTemplateMeta> = Object.fromEntries(
  EMAIL_TEMPLATES.map((t) => [t.id, t]),
);

export const CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  auth: "Autenticación",
  onboarding: "Onboarding",
  engagement: "Engagement",
  lifecycle: "Ciclo de vida",
  circles: "Círculos",
  admin: "Admin / Familia",
};
