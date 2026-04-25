// Definición declarativa de los crons del producto.
//
// Esta es la fuente de verdad. Cuando cambias algo aquí + redeploy,
// llamando a POST /api/admin/sync-crons se reflejan en cron-job.org.
//
// Reglas:
// - El TÍTULO es la clave de identidad. Sólo se sincronizan jobs con prefijo
//   MANAGED_TITLE_PREFIX. Jobs creados a mano fuera del prefijo NO se tocan.
// - Para añadir un cron: añadir entrada al array MANAGED_CRONS, redeploy,
//   POST /api/admin/sync-crons (con dryRun=1 primero).
// - Para borrar: eliminar la entrada, mismo flujo. La sync detecta el job
//   huérfano y lo borra.

export const MANAGED_TITLE_PREFIX = "[mw-sync]";

export type CronSchedule = {
  // Formato cron-job.org: arrays de números, [-1] significa "todos".
  minutes: number[]; // 0-59
  hours: number[]; // 0-23
  mdays: number[]; // 1-31, [-1] = cualquier día del mes
  months: number[]; // 1-12, [-1] = cualquier mes
  wdays: number[]; // 0-6 (domingo=0), [-1] = cualquier día de la semana
  timezone: string; // ej. "Europe/Madrid"
};

export type ManagedCron = {
  /** Identificador único, sin espacios. Se compone con prefijo en el título. */
  name: string;
  /** Descripción para humanos en el título visible en cron-job.org. */
  description: string;
  /** Path absoluto del endpoint (sin host). El host se inyecta desde APP_BASE_URL. */
  path: string;
  /** Search params adicionales (ej. kind=health-daily). secret se inyecta desde CRON_SECRET. */
  params?: Record<string, string>;
  schedule: CronSchedule;
  enabled: boolean;
};

const TZ = "Europe/Madrid";

/**
 * Helpers para que la cadencia sea legible.
 * Internamente cron-job.org espera arrays; estos helpers traducen.
 */
export const every = {
  /** Cada día del mes / mes / semana — equivalente a "*". */
  ALL: [-1] as number[],
};

function dailyAt(hour: number, minute = 0): CronSchedule {
  return {
    minutes: [minute],
    hours: [hour],
    mdays: every.ALL,
    months: every.ALL,
    wdays: every.ALL,
    timezone: TZ,
  };
}

function weeklyAt(weekday: number, hour: number, minute = 0): CronSchedule {
  return {
    minutes: [minute],
    hours: [hour],
    mdays: every.ALL,
    months: every.ALL,
    wdays: [weekday], // 0=domingo, 1=lunes, ..., 5=viernes
    timezone: TZ,
  };
}

function monthlyAt(dayOfMonth: number, hour: number, minute = 0): CronSchedule {
  return {
    minutes: [minute],
    hours: [hour],
    mdays: [dayOfMonth],
    months: every.ALL,
    wdays: every.ALL,
    timezone: TZ,
  };
}

// ── Definiciones ────────────────────────────────────────────────────────────
// El orden refleja el horario diario para fácil lectura.

export const MANAGED_CRONS: ManagedCron[] = [
  {
    name: "capsule-snapshot",
    description: "Cápsula del tiempo · genera snapshots diarios",
    path: "/api/cron/capsule-snapshot",
    schedule: dailyAt(4),
    enabled: true,
  },
  {
    name: "admin-report-health",
    description: "Reporte diario de salud de producción a Telegram admin",
    path: "/api/cron/admin-report",
    params: { kind: "health-daily" },
    schedule: dailyAt(8),
    enabled: true,
  },
  {
    name: "capsule-deliver",
    description: "Cápsula del tiempo · entrega + email cuando deliverAt vence",
    path: "/api/cron/capsule-deliver",
    schedule: dailyAt(9),
    enabled: true,
  },
  {
    name: "circle-pulses",
    description: "Círculos v2 · abre pulses semanales y cierra los expirados (genera reflexiones)",
    path: "/api/cron/circle-pulses",
    schedule: dailyAt(9, 30),
    enabled: true,
  },
  {
    name: "circle-matchmaking",
    description: "Círculos v2 · cierra ciclos vencidos y forma nuevos círculos por patrón",
    path: "/api/cron/circle-matchmaking",
    schedule: weeklyAt(1, 6), // lunes 06:00
    enabled: true,
  },
  {
    name: "7d-nudge",
    description: "Reactivación específica con la última frase del usuario a los 7 días",
    path: "/api/cron/7d-nudge",
    schedule: dailyAt(10),
    enabled: true,
  },
  {
    name: "admin-report-email-capture",
    description: "Reporte semanal de captura de email (LAXA) a Telegram",
    path: "/api/cron/admin-report",
    params: { kind: "email-capture-week" },
    schedule: weeklyAt(5, 18), // viernes 18:00
    enabled: true,
  },
  {
    name: "admin-report-dormant",
    description: "Reporte semanal de candidatos a purga (anónimos dormidos)",
    path: "/api/cron/admin-report",
    params: { kind: "dormant-weekly" },
    schedule: weeklyAt(0, 23), // domingo 23:00
    enabled: true,
  },
  {
    name: "admin-report-usage",
    description: "Reporte mensual de uso del mentor",
    path: "/api/cron/admin-report",
    params: { kind: "usage-monthly" },
    schedule: monthlyAt(1, 9),
    enabled: true,
  },
];

/**
 * Construye el título exacto que aparecerá en cron-job.org.
 * Es la clave de identidad: la sync busca jobs por este prefijo + name.
 */
export function buildJobTitle(cron: Pick<ManagedCron, "name" | "description">): string {
  return `${MANAGED_TITLE_PREFIX} ${cron.name} — ${cron.description}`;
}

/**
 * Devuelve sólo el `name` extraído del título de un job remoto, o null si
 * el job no es gestionado por sync (no tiene el prefijo).
 */
export function extractManagedName(remoteTitle: string): string | null {
  if (!remoteTitle.startsWith(MANAGED_TITLE_PREFIX)) return null;
  const tail = remoteTitle.slice(MANAGED_TITLE_PREFIX.length).trim();
  const sepIdx = tail.indexOf(" — ");
  if (sepIdx === -1) return tail; // tolerante a títulos sin descripción
  return tail.slice(0, sepIdx);
}

/**
 * Construye la URL completa de un job, inyectando APP_BASE_URL y CRON_SECRET
 * en runtime (NUNCA hardcodear secret en código).
 */
export function buildJobUrl(
  cron: ManagedCron,
  options: { appBaseUrl: string; cronSecret: string },
): string {
  const url = new URL(cron.path, options.appBaseUrl);
  if (cron.params) {
    for (const [k, v] of Object.entries(cron.params)) {
      url.searchParams.set(k, v);
    }
  }
  url.searchParams.set("secret", options.cronSecret);
  return url.toString();
}
