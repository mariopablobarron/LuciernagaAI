export type SaasPlan = {
  id: "starter" | "pro";
  name: string;
  priceLabel: string;
  status: "planned" | "ready";
  description: string;
};

export const SAAS_CONFIG = {
  name: "Luciernaga AI",
  description:
    "SaaS de mentoria conversacional con IA, enfoque en accion, continuidad emocional y gestion de riesgo.",
  marketingTitle: "Luciernaga AI | Mentor conversacional con accion real",
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
    enabled: false,
    plans: [
      {
        id: "starter",
        name: "Starter",
        priceLabel: "Pendiente",
        status: "planned",
        description: "Plan base para sesiones guiadas y seguimiento ligero.",
      },
      {
        id: "pro",
        name: "Pro",
        priceLabel: "Pendiente",
        status: "planned",
        description: "Plan avanzado con mas seguimiento, analytics y soporte.",
      },
    ] satisfies SaasPlan[],
  },
} as const;

export const SAAS_ADMIN_NAV = [
  { id: "overview", label: "Resumen", description: "KPI de negocio y salud del producto" },
  { id: "segments", label: "Segmentos", description: "Nuevos, activos, retorno e inactivos" },
  { id: "crisis", label: "Crisis", description: "Eventos high/critical y contencion" },
  { id: "avoidance", label: "Evasion", description: "Resistencia y deuda de ejecucion" },
  { id: "history", label: "Historial", description: "Decisiones e insights persistidos" },
] as const;
