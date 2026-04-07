"use client";

import { useRouter } from "next/navigation";
import {
  ShieldCheck, Users, Brain, AlertTriangle, BarChart3,
  Bell, Terminal, CreditCard, Clock, ChevronRight,
  Building2, Heart, Send, Eye, Flame, Activity,
  BookOpen, Lock, Zap, MessageCircle, Bot,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Step = { text: string };
type Feature = { icon: typeof ShieldCheck; label: string; desc: string };
type FaqItem = { q: string; a: string };

type Section = {
  id: string;
  icon: typeof ShieldCheck;
  color: string;
  bg: string;
  border: string;
  title: string;
  subtitle: string;
  steps?: Step[];
  features?: Feature[];
  table?: { headers: string[]; rows: string[][] };
};

const SECTIONS: Section[] = [
  {
    id: "acceso",
    icon: Lock,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "1. Acceso y roles",
    subtitle: "4 sistemas de autenticacion independientes",
    features: [
      { icon: ShieldCheck, label: "Admin / Clinico", desc: "Login en /admin/login con ADMIN_USERNAME y ADMIN_PASSWORD. Cookie de 24h. Acceso a todo el panel admin y panel clinico." },
      { icon: Building2, label: "Organizaciones (B2B)", desc: "Login en /org/login con slug + email + contrasena. Roles: HR (dashboard) y terapeuta (pacientes)." },
      { icon: Heart, label: "Portal familia", desc: "Acceso via token unico en /family/[token]. Solo lectura: progreso, logros, racha. Puede enviar mensajes de apoyo." },
      { icon: Users, label: "Usuarios finales", desc: "Login en /login con email + contrasena. Sesion anonima posible via bootstrap. Alternativa: bot de Telegram." },
    ],
  },
  {
    id: "panel",
    icon: BarChart3,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    title: "2. Panel de administracion",
    subtitle: "Todas las secciones del admin",
    features: [
      { icon: BarChart3, label: "Dashboard", desc: "Metricas generales, insights, alertas, retencion, distribucion emocional, crisis y decisiones." },
      { icon: Users, label: "Usuarios", desc: "Listado con filtros, engagement score. Detalle: conversaciones, timeline emocional, objetivos, export PDF." },
      { icon: Brain, label: "Panel clinico", desc: "Monitorizacion de estados emocionales, riesgo, rachas, intervenciones. Misma sesion que admin." },
      { icon: Activity, label: "Analytics", desc: "Retencion por cohortes, funnels de conversion." },
      { icon: AlertTriangle, label: "Crisis", desc: "Eventos activos e historico (24h/7d/30d). Nivel, mensaje trigger y acciones." },
      { icon: Eye, label: "Auditoria", desc: "Log completo de eventos del sistema." },
      { icon: Zap, label: "LLM Usage", desc: "Consumo de tokens y costes de IA por periodo." },
      { icon: BookOpen, label: "Investigacion", desc: "Herramientas de analisis de datos." },
    ],
  },
  {
    id: "clinico",
    icon: Brain,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
    title: "3. Panel clinico",
    subtitle: "Monitorizacion emocional e intervenciones",
    steps: [
      { text: "Accede a /admin-clinical para ver la lista de usuarios con estado emocional, riesgo y racha." },
      { text: "Filtra por estado (ansiedad, bloqueo, duda, claridad, neutral) o solo riesgo alto/critico." },
      { text: "Haz clic en \"Ver\" para el detalle: perfil emocional, objetivos, crisis, mensajes." },
      { text: "Envia intervenciones (mensaje, recomendacion, recurso o evaluacion) desde el panel lateral sticky." },
      { text: "Si el usuario tiene Telegram vinculado, marca \"Notificar por Telegram\" para envio inmediato." },
    ],
  },
  {
    id: "riesgo",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "4. Niveles de riesgo y crisis",
    subtitle: "Como interpretar y actuar",
    table: {
      headers: ["Nivel", "Significado", "Accion"],
      rows: [
        ["Low", "Sin senales de alarma", "Seguimiento rutinario"],
        ["Medium", "Patron de evitacion o estado negativo sostenido", "Revisar historial"],
        ["High", "Crisis recientes o ansiedad persistente", "Contactar en 24h"],
        ["Critical", "Crisis activa en este momento", "Intervencion inmediata"],
      ],
    },
  },
  {
    id: "telegram",
    icon: Bot,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    title: "5. Telegram — notificaciones y comandos",
    subtitle: "Recibes alertas automaticas y puedes consultar metricas",
    features: [
      { icon: Users, label: "Actividad", desc: "Nuevo usuario, email capturado, racha destacada (3/7/14/21/30 dias)." },
      { icon: AlertTriangle, label: "Crisis", desc: "Deteccion de riesgo vital en web o Telegram. Nivel, fragmento y origen." },
      { icon: CreditCard, label: "Pagos", desc: "Trial iniciado, pago confirmado, suscripcion cancelada (Stripe webhook)." },
      { icon: MessageCircle, label: "Otros", desc: "Test diagnostico completado, formulario de contacto, resumen semanal." },
    ],
  },
  {
    id: "comandos",
    icon: Terminal,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "6. Comandos admin en Telegram",
    subtitle: "Escribe al bot desde tu ADMIN_TELEGRAM_ID",
    steps: [
      { text: "/ayuda — Lista todos los comandos admin disponibles" },
      { text: "/stats — Activos hoy, nuevos hoy, mensajes totales, distribucion de estados" },
      { text: "/usuarios — Ultimos 20 usuarios activos en las 24h anteriores" },
      { text: "/crisis — Usuarios con crisis activa en este momento" },
      { text: "/retencion — Totales, activos esta semana, rachas activas" },
      { text: "/estado — Distribucion emocional actual de todos los usuarios" },
      { text: "/tareas — Cola de tareas admin pendientes" },
      { text: "Cualquier otro mensaje activa modo IA libre con contexto de metricas del sistema." },
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "7. Planes y billing",
    subtitle: "Stripe: Free (0 EUR), Pro mensual (9 EUR/mes), Pro anual (79 EUR/ano)",
    features: [
      { icon: Zap, label: "Free", desc: "10 conversaciones/mes, 20 mensajes/conversacion. Check-in y objetivos incluidos." },
      { icon: Flame, label: "Pro", desc: "Ilimitado + Modo Impulso + Journeys completos. 7 dias de prueba gratuita." },
      { icon: Send, label: "Flujo", desc: "Checkout via /api/billing/checkout. Portal de gestion via /api/billing/portal." },
      { icon: Bell, label: "Override", desc: "FREE_PLAN_UNLIMITED=true desactiva limites del plan gratuito (testing)." },
    ],
  },
  {
    id: "cron",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "8. Cron jobs automaticos",
    subtitle: "Todos requieren ?secret=CRON_SECRET",
    steps: [
      { text: "/api/cron/weekly-summary — Resumen semanal enviado por Telegram" },
      { text: "/api/cron/action-reminders — Recordatorios de acciones pendientes" },
      { text: "/api/cron/reminders — Recordatorios generales a usuarios" },
      { text: "/api/cron/user-weekly-review — Revision semanal proactiva por usuario" },
      { text: "/api/cron/proactive-review — Revision proactiva de progreso" },
      { text: "/api/cron/inactivity-check — Deteccion de usuarios inactivos" },
    ],
  },
];

const FAQ: FaqItem[] = [
  { q: "El panel clinico requiere login separado?", a: "No. Usa la misma sesion que el admin (/admin/login). La cookie mw_admin_session da acceso a ambos paneles." },
  { q: "Como creo una organizacion B2B?", a: "Las organizaciones se gestionan en la base de datos (tabla Organization + OrgAdmin). Usa como referencia el script scripts/seed-org-demo.mjs." },
  { q: "Como registro el webhook de Telegram?", a: "Ejecuta: curl -X POST \"https://api.telegram.org/bot<TOKEN>/setWebhook\" -H \"Content-Type: application/json\" -d '{\"url\": \"https://tu-dominio.com/api/telegram/webhook\"}'" },
  { q: "Como obtengo mi ADMIN_TELEGRAM_ID?", a: "Escribe /start a @userinfobot en Telegram. El bot responde con tu ID numerico." },
  { q: "Donde se configuran las credenciales admin?", a: "En las variables de entorno ADMIN_USERNAME y ADMIN_PASSWORD. En produccion se configuran en Coolify, nunca en el repositorio." },
  { q: "Puedo exportar los datos de un usuario?", a: "Si. Desde /admin/users/[id] puedes exportar un PDF con el historial completo del usuario via /api/admin/users/[id]/export-pdf." },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminGuiaPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <AdminShell
      title="Guia de administracion"
      subtitle="Todo lo que necesitas para gestionar la plataforma, el panel clinico, notificaciones y operaciones."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
          >
            {s.title.split(". ")[1]}
          </a>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={`w-11 h-11 rounded-xl ${section.bg} border ${section.border} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  <p className="text-sm text-zinc-400 mt-1">{section.subtitle}</p>
                </div>
              </div>

              {/* Steps */}
              {section.steps && (
                <div className="space-y-3 ml-14">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-zinc-400">{i + 1}</span>
                      </span>
                      <p className="text-sm text-zinc-300 leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Features */}
              {section.features && (
                <div className="grid sm:grid-cols-2 gap-3 ml-14">
                  {section.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <div
                        key={f.label}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FIcon className={`w-4 h-4 ${section.color}`} />
                          <p className="text-sm font-semibold text-white">{f.label}</p>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table */}
              {section.table && (
                <div className="ml-14 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {section.table.headers.map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {section.table.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={`px-4 py-3 ${j === 0 ? "font-semibold text-white" : "text-zinc-400"}`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-white">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
