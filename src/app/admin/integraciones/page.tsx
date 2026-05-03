"use client";

import { useRouter } from "next/navigation";
import { Webhook, Zap, Bell, Mail, Shield, Activity, CheckCircle, XCircle } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

const N8N_EVENTS = [
  {
    type: "user.signup",
    desc: "Nuevo usuario registrado",
    trigger: "Registro completado",
    example: "{ email, name, phone, source, orgId }",
  },
  {
    type: "user.inactive",
    desc: "Usuario inactivo X dias",
    trigger: "Cron de inactividad",
    example: "{ daysSinceLastSeen, email }",
  },
  {
    type: "user.milestone",
    desc: "Hito alcanzado",
    trigger: "Streak, badge, etc.",
    example: "{ milestone, value }",
  },
  {
    type: "crisis.detected",
    desc: "Crisis detectada",
    trigger: "Chat o Telegram detecta crisis",
    example: "{ level, message }",
  },
  {
    type: "crisis.resolved",
    desc: "Crisis resuelta",
    trigger: "Estado crisis desactivado",
    example: "{ durationMinutes }",
  },
  {
    type: "action.completed",
    desc: "Accion completada",
    trigger: "Usuario completa una accion",
    example: "{ actionId, goalTitle }",
  },
  {
    type: "goal.completed",
    desc: "Objetivo completado",
    trigger: "Todas las acciones completadas",
    example: "{ goalId, goalTitle }",
  },
  {
    type: "project.created",
    desc: "Proyecto personal creado",
    trigger: "Usuario crea proyecto",
    example: "{ projectId, title }",
  },
  {
    type: "project.phase_change",
    desc: "Cambio de fase",
    trigger: "Usuario avanza de fase",
    example: "{ projectId, oldPhase, newPhase }",
  },
  {
    type: "subscription.changed",
    desc: "Cambio de plan",
    trigger: "Stripe webhook",
    example: "{ plan, status, stripeId }",
  },
  {
    type: "community.post",
    desc: "Post en comunidad",
    trigger: "Nuevo post publicado",
    example: "{ postId, anonymous }",
  },
  {
    type: "diary.entry",
    desc: "Entrada de diario",
    trigger: "Diario emocional guardado",
    example: "{ mood, tags }",
  },
  {
    type: "state.transitional_void",
    desc: "Vacio transicional",
    trigger: "Detectado en chat",
    example: "{ state }",
  },
];

const ENV_VARS = [
  {
    name: "N8N_EVENTS_WEBHOOK_URL",
    desc: "Webhook principal — recibe TODOS los eventos. Configura un workflow con Switch node para rutear por event.type.",
    required: true,
  },
  {
    name: "N8N_ACTION_WEBHOOK",
    desc: "Legacy: solo action.completed. Se mantiene por compatibilidad.",
    required: false,
  },
  {
    name: "N8N_TRANSITIONAL_VOID_WEBHOOK",
    desc: "Legacy: solo state.transitional_void. Se mantiene por compatibilidad.",
    required: false,
  },
];

const WORKFLOW_IDEAS = [
  {
    title: "Onboarding email secuencia",
    desc: "user.signup → dia 1: bienvenida → dia 3: primer paso → dia 7: como va",
    icon: Mail,
  },
  {
    title: "Re-engagement multicanal",
    desc: "user.inactive (3d) → email. (7d) → Telegram. (14d) → alerta admin",
    icon: Bell,
  },
  {
    title: "Crisis → escalacion",
    desc: "crisis.detected → Slack urgente + email terapeuta + SMS contacto de confianza",
    icon: Shield,
  },
  {
    title: "Reporte semanal",
    desc: "Cron lunes → recopilar metricas → generar PDF → email equipo + Google Sheets",
    icon: Activity,
  },
  {
    title: "Lead nurturing",
    desc: "user.signup (fuente=quiz) → secuencia personalizada segun perfil emocional",
    icon: Zap,
  },
  {
    title: "Celebracion hitos",
    desc: "user.milestone → email motivacional + badge otorgado + notificar familia si tiene contacto",
    icon: CheckCircle,
  },
];

export default function IntegracionesPage() {
  const router = useRouter();

  function handleLogout() {
    fetch("/api/admin/logout", { credentials: "include", method: "POST" }).then(() =>
      router.replace("/admin/login")
    );
  }

  return (
    <AdminShell
      title="Integraciones n8n"
      subtitle="Centro de control para webhooks, eventos y automatizaciones externas"
      onLogout={handleLogout}
    >
      {/* How it works */}
      <AdminPanel title="Como funciona" tooltip="Arquitectura del sistema de eventos">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3 text-sm text-zinc-400">
          <div className="flex items-start gap-3">
            <Webhook className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-white font-semibold">Un solo webhook, todos los eventos</p>
              <p className="mt-1">
                Configura{" "}
                <code className="text-violet-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
                  N8N_EVENTS_WEBHOOK_URL
                </code>{" "}
                en Coolify. Todos los eventos de la plataforma llegan ahi como POST con{" "}
                <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">
                  {"{ type, timestamp, userId, data }"}
                </code>
                .
              </p>
              <p className="mt-2">
                En n8n, crea un workflow que empiece con{" "}
                <strong className="text-white">Webhook node</strong> y luego un{" "}
                <strong className="text-white">Switch node</strong> que rutee por{" "}
                <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">event.type</code>.
              </p>
            </div>
          </div>
        </div>
      </AdminPanel>

      {/* Environment variables */}
      <AdminPanel title="Variables de entorno" tooltip="Configurar en Coolify">
        <div className="space-y-2">
          {ENV_VARS.map((v) => (
            <div
              key={v.name}
              className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3"
            >
              <div className="mt-0.5">
                {v.required ? (
                  <CheckCircle className="h-4 w-4 text-violet-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-600" />
                )}
              </div>
              <div>
                <code className="text-xs text-violet-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {v.name}
                </code>
                {v.required && (
                  <span className="ml-2 text-[10px] text-amber-400 font-semibold">PRINCIPAL</span>
                )}
                <p className="mt-1 text-xs text-zinc-500">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      {/* Events catalog */}
      <AdminPanel title="Catalogo de eventos" tooltip="Todos los eventos que se envian a n8n">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="px-3 py-2 text-left">Evento</th>
                <th className="px-3 py-2 text-left">Descripcion</th>
                <th className="px-3 py-2 text-left">Se dispara cuando</th>
                <th className="px-3 py-2 text-left">Datos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {N8N_EVENTS.map((ev) => (
                <tr key={ev.type} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-2">
                    <code className="text-violet-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {ev.type}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{ev.desc}</td>
                  <td className="px-3 py-2 text-zinc-500">{ev.trigger}</td>
                  <td className="px-3 py-2 text-zinc-600 font-mono text-[10px]">{ev.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      {/* Workflow ideas */}
      <AdminPanel
        title="Ideas de workflows"
        tooltip="Ejemplos de automatizaciones que puedes crear en n8n"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKFLOW_IDEAS.map((idea, i) => {
            const Icon = idea.icon;
            return (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">{idea.title}</span>
                </div>
                <p className="text-xs text-zinc-500">{idea.desc}</p>
              </div>
            );
          })}
        </div>
      </AdminPanel>

      {/* Architecture file */}
      <AdminPanel title="Archivo central" tooltip="Donde esta el codigo">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-400 space-y-2">
          <p>
            <strong className="text-white">Dispatcher:</strong>{" "}
            <code className="text-violet-300">src/lib/n8n.ts</code> — punto unico de envio de
            eventos
          </p>
          <p>
            <strong className="text-white">Eventos DB:</strong>{" "}
            <code className="text-violet-300">src/services/events.ts</code> — tracking interno para
            analytics
          </p>
          <p>
            <strong className="text-white">Alertas:</strong>{" "}
            <code className="text-violet-300">src/lib/alerts.ts</code> — notificaciones
            Telegram/email
          </p>
          <p className="text-zinc-600 pt-2">
            Los tres sistemas son independientes. Un evento puede disparar los tres: guardarse en
            BD, enviarse a n8n, y generar una alerta.
          </p>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
