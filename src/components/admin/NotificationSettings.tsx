"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Mail, MessageSquare, Clock, Loader2 } from "lucide-react";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type NotificationConfig = {
  emailNewUser: boolean;
  emailCrisis: boolean;
  emailRetentionDrop: boolean;
  emailWeeklySummary: boolean;
  emailAvoidanceEscalation: boolean;
  telegramNewUser: boolean;
  telegramCrisis: boolean;
  telegramUserMessages: boolean;
  telegramWeeklySummary: boolean;
  telegramAvoidanceEscalation: boolean;
  cronDailyCheckin: boolean;
  cronWeeklyReview: boolean;
  cronWeeklyInactiveReminder: boolean;
  cronActionReminders: boolean;
  cronInactivityCheck: boolean;
  cronProactiveReview: boolean;
};

type ToggleItem = {
  key: keyof NotificationConfig;
  label: string;
  description: string;
};

const EMAIL_TOGGLES: ToggleItem[] = [
  { key: "emailNewUser", label: "Nuevo usuario", description: "Aviso cuando alguien se registra" },
  { key: "emailCrisis", label: "Crisis detectada", description: "Alerta cuando un usuario entra en estado de riesgo" },
  { key: "emailRetentionDrop", label: "Caída de retención", description: "Aviso cuando la retención baja de umbrales críticos" },
  { key: "emailWeeklySummary", label: "Resumen semanal", description: "Informe semanal del estado del sistema" },
  { key: "emailAvoidanceEscalation", label: "Escalado de evitación", description: "Alerta cuando un usuario evita repetidamente" },
];

const TELEGRAM_TOGGLES: ToggleItem[] = [
  { key: "telegramNewUser", label: "Nuevo usuario", description: "Notificación al registrarse alguien" },
  { key: "telegramCrisis", label: "Crisis detectada", description: "Alerta inmediata de crisis" },
  { key: "telegramUserMessages", label: "Mensajes de usuarios", description: "Reenvío de cada conversación del bot" },
  { key: "telegramWeeklySummary", label: "Resumen semanal", description: "Stats semanales del sistema" },
  { key: "telegramAvoidanceEscalation", label: "Escalado de evitación", description: "Alertas de evitación repetida" },
];

const CRON_TOGGLES: ToggleItem[] = [
  { key: "cronDailyCheckin", label: "Check-in diario (9am/9pm)", description: "Pregunta mañana y noche por Telegram a los usuarios" },
  { key: "cronWeeklyReview", label: "Informe semanal (usuarios activos)", description: "Resumen de la semana a usuarios activos" },
  { key: "cronWeeklyInactiveReminder", label: "Recordatorio inactivos (7+ días)", description: "Email a usuarios que llevan 7+ días sin entrar" },
  { key: "cronActionReminders", label: "Recordatorio de acciones", description: "Recordatorio diario de acciones pendientes" },
  { key: "cronInactivityCheck", label: "Alerta inactividad (familia)", description: "Aviso a contactos de confianza si el usuario desaparece" },
  { key: "cronProactiveReview", label: "Revisión proactiva", description: "Alerta diaria al admin sobre usuarios en riesgo" },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-violet-500" : "bg-zinc-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  item,
  config,
  saving,
  onToggle,
}: {
  item: ToggleItem;
  config: NotificationConfig;
  saving: string | null;
  onToggle: (key: keyof NotificationConfig, val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200">{item.label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
      </div>
      <div className="flex items-center gap-2">
        {saving === item.key && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
        <Toggle
          checked={config[item.key]}
          onChange={(val) => onToggle(item.key, val)}
          disabled={saving === item.key}
        />
      </div>
    </div>
  );
}

export default function NotificationSettings() {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = (await res.json()) as NotificationConfig;
        setConfig(data);
      }
    } catch {
      setError("Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  async function handleToggle(key: keyof NotificationConfig, val: boolean) {
    if (!config) return;
    setSaving(key);
    setError(null);

    const prev = config[key];
    setConfig({ ...config, [key]: val });

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: val }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as NotificationConfig;
      setConfig(updated);
    } catch {
      setConfig({ ...config, [key]: prev });
      setError("Error guardando cambio");
    } finally {
      setSaving(null);
    }
  }

  if (loading || !config) {
    return (
      <AdminPanel title="Notificaciones" description="Cargando...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </AdminPanel>
    );
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      <AdminPanel
        title="Alertas por email"
        description={`Se envían a ${process.env.NEXT_PUBLIC_ALERT_EMAIL || "mario@startidea.es"}`}
        headerRight={<Mail className="h-5 w-5 text-violet-400" />}
      >
        {EMAIL_TOGGLES.map((item) => (
          <ToggleRow key={item.key} item={item} config={config} saving={saving} onToggle={handleToggle} />
        ))}
      </AdminPanel>

      <AdminPanel
        title="Alertas por Telegram"
        description="Se envían a tu chat de admin"
        headerRight={<MessageSquare className="h-5 w-5 text-cyan-400" />}
      >
        {TELEGRAM_TOGGLES.map((item) => (
          <ToggleRow key={item.key} item={item} config={config} saving={saving} onToggle={handleToggle} />
        ))}
      </AdminPanel>

      <AdminPanel
        title="Cron jobs automáticos"
        description="Mensajes programados a los usuarios"
        headerRight={<Clock className="h-5 w-5 text-amber-400" />}
      >
        {CRON_TOGGLES.map((item) => (
          <ToggleRow key={item.key} item={item} config={config} saving={saving} onToggle={handleToggle} />
        ))}
      </AdminPanel>
    </>
  );
}
