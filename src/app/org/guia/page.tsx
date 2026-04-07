"use client";

import { useRouter } from "next/navigation";
import {
  Building2, Users, BarChart3, ShieldCheck, AlertTriangle,
  Heart, Brain, Target, Flame, TrendingUp,
  ChevronRight, LogOut, Eye, BookOpen, HelpCircle,
  Activity, MessageCircle, Phone,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Step = { text: string };
type Feature = { icon: typeof Building2; label: string; desc: string };
type FaqItem = { q: string; a: string };

type Section = {
  id: string;
  icon: typeof Building2;
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
    icon: Building2,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "1. Como acceder",
    subtitle: "Entra al portal con las credenciales de tu organizacion",
    steps: [
      { text: "Ve a la pagina de login organizacional (/org/login)." },
      { text: "Introduce el identificador de tu organizacion (ej. mi-centro)." },
      { text: "Escribe tu email profesional y contrasena." },
      { text: "Pulsa \"Entrar\". Seras redirigido a tu panel segun tu rol." },
    ],
  },
  {
    id: "roles",
    icon: Users,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    title: "2. Roles disponibles",
    subtitle: "Cada rol ve informacion adaptada a su funcion",
    features: [
      { icon: BarChart3, label: "HR / Responsable", desc: "Dashboard con metricas anonimizadas y agregadas de todo el equipo. No ve datos individuales." },
      { icon: Brain, label: "Psicologo / Terapeuta", desc: "Lista de pacientes con indicadores clinicos, flags de riesgo y estado emocional individual." },
    ],
  },
  {
    id: "dashboard",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "3. Dashboard de bienestar (HR)",
    subtitle: "Metricas anonimizadas del equipo",
    features: [
      { icon: Users, label: "Usuarios activos", desc: "Numero de personas que estan usando la plataforma activamente." },
      { icon: TrendingUp, label: "Retencion 7 dias", desc: "Porcentaje de personas que siguen activas tras una semana." },
      { icon: Flame, label: "Media de racha", desc: "Promedio de dias consecutivos de check-in del equipo." },
      { icon: MessageCircle, label: "Mensajes por usuario", desc: "Media de mensajes enviados por persona." },
      { icon: Target, label: "Metas completadas", desc: "Porcentaje de objetivos marcados como completados." },
      { icon: AlertTriangle, label: "Eventos de crisis", desc: "Situaciones de alto riesgo detectadas en los ultimos 30 dias." },
    ],
  },
  {
    id: "estados",
    icon: Brain,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
    title: "4. Estados emocionales",
    subtitle: "El sistema detecta automaticamente el estado de cada persona",
    table: {
      headers: ["Estado", "Senales tipicas", "Que significa"],
      rows: [
        ["Claridad", "Energia, enfoque, progreso", "Se sienten bien y avanzan"],
        ["Neutral", "Sin senales destacables", "Estado base, estable"],
        ["Duda", "Incertidumbre, preguntas", "Necesitan orientacion"],
        ["Bloqueo", "Paralisis, postergar tareas", "Necesitan apoyo para desbloquear"],
        ["Ansiedad", "Presion, estres, rumiacion", "Necesitan contencion y calma"],
      ],
    },
  },
  {
    id: "pacientes",
    icon: Eye,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "5. Lista de pacientes (terapeuta)",
    subtitle: "Indicadores clinicos por persona",
    features: [
      { icon: AlertTriangle, label: "Flag de riesgo", desc: "Verde (bien), amarillo (atencion: riesgo medio o 3+ dias sin actividad), rojo (crisis activa)." },
      { icon: Brain, label: "Estado y emocion", desc: "Estado emocional actual, emocion primaria y patron de comportamiento dominante." },
      { icon: TrendingUp, label: "Tendencia", desc: "Mejorando, estable o empeorando — basado en la evolucion reciente." },
      { icon: Flame, label: "Racha", desc: "Dias consecutivos de check-in (actual y mejor historica)." },
      { icon: Target, label: "Objetivo activo", desc: "Titulo del objetivo actual y porcentaje de progreso en sus acciones." },
      { icon: Activity, label: "Evitacion", desc: "Si ha postergado o rechazado acciones recientemente — patron frecuente en bloqueo." },
    ],
  },
  {
    id: "riesgo",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "6. Niveles de riesgo",
    subtitle: "Como interpretar y cuando actuar",
    table: {
      headers: ["Nivel", "Significado", "Accion sugerida"],
      rows: [
        ["Low", "Sin alarmas", "Seguimiento habitual"],
        ["Medium", "Patron negativo sostenido o inactividad", "Revisar y valorar contacto"],
        ["High", "Crisis recientes o ansiedad persistente", "Contactar en 24 horas"],
        ["Critical", "Crisis activa detectada", "Intervencion prioritaria"],
      ],
    },
  },
  {
    id: "crisis",
    icon: Phone,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    title: "7. Protocolo de crisis",
    subtitle: "Que hace el sistema cuando detecta riesgo vital",
    steps: [
      { text: "Activa un modo de contencion para el usuario." },
      { text: "Muestra el telefono 024 (linea de atencion a la conducta suicida en Espana)." },
      { text: "Registra el evento con nivel y fragmento del mensaje." },
      { text: "Notifica al administrador del sistema por Telegram." },
      { text: "Si el usuario tiene persona de confianza, puede alertarla automaticamente." },
    ],
  },
  {
    id: "privacidad",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "8. Privacidad y datos",
    subtitle: "Proteccion de la informacion del equipo",
    features: [
      { icon: ShieldCheck, label: "Datos anonimizados", desc: "El dashboard HR solo muestra estadisticas agregadas. Ningun dato individual es visible." },
      { icon: Users, label: "Minimo 5 usuarios", desc: "Si hay menos de 5 personas activas, no se muestran datos — proteccion contra re-identificacion." },
      { icon: Eye, label: "Sin conversaciones", desc: "Ni HR ni el terapeuta pueden ver el contenido de las conversaciones de chat." },
      { icon: Heart, label: "Consentimiento", desc: "Los usuarios aceptan los terminos al registrarse. Pueden eliminar sus datos en cualquier momento." },
    ],
  },
];

const FAQ: FaqItem[] = [
  { q: "Puedo ver las conversaciones de mis pacientes?", a: "No. El terapeuta ve un resumen clinico (estado, riesgo, racha, objetivos) pero nunca el contenido de las conversaciones. Esto protege la privacidad del usuario." },
  { q: "Los datos del dashboard son en tiempo real?", a: "Se calculan al cargar la pagina. Recarga para ver los datos mas recientes." },
  { q: "Que pasa si hay menos de 5 usuarios?", a: "El dashboard de HR no muestra datos. Aparece un aviso de privacidad para evitar que se identifiquen personas individuales." },
  { q: "Puedo enviar mensajes a los pacientes?", a: "No directamente desde el portal org. Las intervenciones se hacen desde el panel clinico del administrador (/admin-clinical). Solicita acceso si lo necesitas." },
  { q: "Como se anaden nuevos miembros a mi organizacion?", a: "Los usuarios se asignan desde la base de datos. Coordina con el equipo tecnico para anadir nuevos miembros." },
  { q: "La plataforma sustituye terapia profesional?", a: "No. Es una herramienta de apoyo, coaching y deteccion temprana. En caso de crisis, conecta con lineas de emergencia (024) y alerta al equipo." },
];

const TIPS_HR = [
  "Revisa el dashboard al menos una vez por semana.",
  "Presta atencion a cambios bruscos en la distribucion de estados.",
  "Si los eventos de crisis suben, coordina con el equipo clinico.",
  "Usa los datos para informar decisiones de bienestar organizacional.",
];

const TIPS_THERAPIST = [
  "Revisa la lista de pacientes al inicio de cada jornada.",
  "Prioriza los flags rojos y amarillos.",
  "3+ dias sin actividad suele indicar que alguien necesita seguimiento.",
  "Los patrones de evitacion repetidos indican bloqueo subyacente.",
  "Coordina con el administrador si necesitas intervenir directamente.",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrgGuiaPage() {
  const router = useRouter();

  function handleLogout() {
    sessionStorage.clear();
    router.push("/org/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-bold">Guia del portal organizacional</h1>
            <p className="text-xs text-zinc-500">Para psicologos, terapeutas y responsables de HR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-300 font-medium">Datos protegidos</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
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
          <a
            href="#tips"
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
          >
            Buenas practicas
          </a>
          <a
            href="#faq"
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
          >
            Preguntas frecuentes
          </a>
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
                  <div className="ml-14 overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
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

          {/* Tips */}
          <section id="tips" className="scroll-mt-24">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">9. Buenas practicas</h2>
                <p className="text-sm text-zinc-400 mt-1">Recomendaciones para sacar el maximo partido al portal</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 ml-14">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm font-semibold text-white">Para HR</p>
                </div>
                <div className="space-y-2">
                  {TIPS_HR.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                      <p className="text-xs text-zinc-400 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-fuchsia-400" />
                  <p className="text-sm font-semibold text-white">Para terapeutas</p>
                </div>
                <div className="space-y-2">
                  {TIPS_THERAPIST.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shrink-0 mt-1.5" />
                      <p className="text-xs text-zinc-400 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

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

        {/* Footer note */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-zinc-600">
            Tres Mil Millones de Latidos — Herramienta de apoyo y deteccion temprana. No sustituye atencion profesional.
          </p>
        </div>
      </div>
    </div>
  );
}
