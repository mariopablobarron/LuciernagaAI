/**
 * n8n Integration Hub — punto central para TODOS los webhooks a n8n.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ CÓMO FUNCIONA                                              │
 * │                                                            │
 * │ 1. Los eventos del sistema (signup, crisis, acción, etc.)  │
 * │    llaman a dispatchN8nEvent() con tipo + payload.         │
 * │                                                            │
 * │ 2. Esta función envía el evento al webhook genérico de n8n │
 * │    (N8N_EVENTS_WEBHOOK_URL). Un solo webhook para todo.    │
 * │                                                            │
 * │ 3. En n8n, un workflow recibe TODOS los eventos y los      │
 * │    rutea con un Switch node según event.type.              │
 * │                                                            │
 * │ 4. Si hay webhooks legacy específicos (N8N_ACTION_WEBHOOK, │
 * │    N8N_TRANSITIONAL_VOID_WEBHOOK), también se disparan     │
 * │    para no romper flujos existentes.                       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * VARIABLES DE ENTORNO:
 *   N8N_EVENTS_WEBHOOK_URL  — webhook principal (recibe todo)
 *   N8N_ACTION_WEBHOOK      — legacy: solo acciones completadas
 *   N8N_TRANSITIONAL_VOID_WEBHOOK — legacy: solo transitional void
 *
 * EVENTOS DISPONIBLES:
 *   user.signup          — nuevo usuario registrado
 *   user.inactive        — usuario inactivo X días
 *   user.milestone       — hito alcanzado (streak, badge, etc.)
 *   crisis.detected      — crisis detectada
 *   crisis.resolved      — crisis resuelta
 *   action.completed     — acción completada
 *   goal.completed       — objetivo completado
 *   project.created      — proyecto personal creado
 *   project.phase_change — cambio de fase en proyecto
 *   subscription.changed — cambio de plan (free↔pro)
 *   community.post       — nuevo post en comunidad
 *   diary.entry          — nueva entrada de diario
 *   state.transitional_void — estado transitional void detectado
 */

import { logError, logInfo } from "@/lib/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export type N8nEventType =
  | "user.signup"
  | "user.inactive"
  | "user.milestone"
  | "crisis.detected"
  | "crisis.resolved"
  | "action.completed"
  | "goal.completed"
  | "project.created"
  | "project.phase_change"
  | "subscription.changed"
  | "community.post"
  | "diary.entry"
  | "state.transitional_void";

export type N8nEventPayload = {
  type: N8nEventType;
  timestamp: string;
  userId?: string;
  data: Record<string, unknown>;
};

// ─── Config ──────────────────────────────────────────────────────────────────

function getMainWebhook(): string | null {
  return process.env.N8N_EVENTS_WEBHOOK_URL?.trim() || null;
}

function getLegacyWebhook(type: N8nEventType): string | null {
  switch (type) {
    case "action.completed":
      return process.env.N8N_ACTION_WEBHOOK?.trim() || null;
    case "state.transitional_void":
      return process.env.N8N_TRANSITIONAL_VOID_WEBHOOK?.trim() || null;
    default:
      return null;
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

async function sendToWebhook(url: string, payload: N8nEventPayload): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dispatch an event to n8n. Fire-and-forget — never blocks the caller.
 *
 * Usage:
 *   dispatchN8nEvent("user.signup", { email, name, source }, userId);
 *   dispatchN8nEvent("crisis.detected", { level: "critical", message }, userId);
 *   dispatchN8nEvent("action.completed", { actionId, goalTitle }, userId);
 */
export function dispatchN8nEvent(
  type: N8nEventType,
  data: Record<string, unknown>,
  userId?: string,
): void {
  const payload: N8nEventPayload = {
    type,
    timestamp: new Date().toISOString(),
    userId,
    data,
  };

  const mainUrl = getMainWebhook();
  const legacyUrl = getLegacyWebhook(type);

  if (!mainUrl && !legacyUrl) return; // No webhooks configured

  // Fire-and-forget — don't await
  const promises: Promise<void>[] = [];

  if (mainUrl) {
    promises.push(
      sendToWebhook(mainUrl, payload)
        .then(() => logInfo("N8N", "event_dispatched", { type, userId }))
        .catch((err) => logError("N8N", err, { type, userId, webhook: "main" })),
    );
  }

  if (legacyUrl) {
    promises.push(
      sendToWebhook(legacyUrl, payload)
        .then(() => logInfo("N8N", "legacy_event_dispatched", { type, userId }))
        .catch((err) => logError("N8N", err, { type, userId, webhook: "legacy" })),
    );
  }

  // Don't await — fire and forget
  void Promise.allSettled(promises);
}
