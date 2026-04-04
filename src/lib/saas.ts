export type SaasPlan = {
  id: "free" | "pro";
  name: string;
  priceLabel: string;
  status: "planned" | "ready";
  description: string;
};

export const SAAS_CONFIG = {
  name: "Luciérnaga AI",
  description:
    "Plataforma de mentoría conversacional con IA. Claridad emocional, acción real y seguimiento continuo para transformar tu vida en 30 días.",
  marketingTitle: "Luciérnaga AI — Mentoría con IA para transformar tu vida",
  auth: {
    mode: "session-cookie",
    selfServeAuthReady: false,
    notes: [
      "Sesion de usuario firmada via cookie HMAC.",
      "Admin separado con cookie y credenciales dedicadas.",
    ],
  },
  billing: {
    provider: "stripe",
    enabled: true,
    plans: [
      {
        id: "free",
        name: "Free",
        priceLabel: "0 €",
        status: "ready",
        description: "Acceso inicial con 10 conversaciones/mes y diagnóstico gratuito.",
      },
      {
        id: "pro",
        name: "Pro",
        priceLabel: "9 €/mes",
        status: "ready",
        description: "Conversaciones ilimitadas, Modo Impulso 21 días, retos personalizados.",
      },
    ] satisfies SaasPlan[],
  },
} as const;

export const SAAS_ADMIN_NAV = [
  { id: "overview", label: "Resumen", description: "KPI de negocio y salud del producto" },
  { id: "segments", label: "Segmentos", description: "Nuevos, activos, retorno e inactivos" },
  { id: "billing", label: "Billing", description: "Estado de planes e integracion de cobros" },
  { id: "crisis", label: "Crisis", description: "Eventos high/critical y contencion" },
  { id: "alerts", label: "Alerts", description: "Alertas operativas priorizadas" },
  { id: "avoidance", label: "Evasion", description: "Resistencia y deuda de ejecucion" },
  { id: "insights", label: "Insights", description: "Lecturas accionables de producto" },
  { id: "history", label: "Historial", description: "Decisiones e insights persistidos" },
] as const;
