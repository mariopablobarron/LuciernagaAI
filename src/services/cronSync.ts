// Lógica de sincronización con la API de cron-job.org.
//
// Diff entre MANAGED_CRONS (código) y los jobs remotos con prefijo
// MANAGED_TITLE_PREFIX. Aplica creates/updates/deletes en orden seguro.
//
// API de cron-job.org: https://docs.cron-job.org
//   GET    /jobs            lista todos
//   PUT    /jobs            crea (devuelve jobId)
//   PATCH  /jobs/{jobId}    actualiza
//   DELETE /jobs/{jobId}    borra

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import {
  MANAGED_CRONS,
  buildJobTitle,
  buildJobUrl,
  extractManagedName,
  type CronSchedule,
  type ManagedCron,
} from "@/lib/cronJobs";

const API_BASE = "https://api.cron-job.org";
const REQUEST_TIMEOUT_S = 30;
// cron-job.org devuelve 429 si pegamos varios PUT seguidos sin pausa.
// 150 ms entre acciones es suficiente para 7-10 jobs sin disparar rate limit.
const APPLY_THROTTLE_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CronSyncConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Missing config: ${missing.join(", ")}`);
  }
}

type RemoteJob = {
  jobId: number;
  enabled: boolean;
  title: string;
  url: string;
  schedule: CronSchedule;
};

type RemoteJobListItem = {
  jobId: number;
  enabled: boolean;
  title: string;
  url: string;
  schedule?: CronSchedule;
};

export type SyncAction =
  | { type: "create"; cron: ManagedCron; title: string; url: string }
  | { type: "update"; jobId: number; cron: ManagedCron; title: string; url: string; reasons: string[] }
  | { type: "delete"; jobId: number; title: string }
  | { type: "noop"; jobId: number; cron: ManagedCron; title: string };

export type SyncResult = {
  plan: SyncAction[];
  applied: boolean;
  errors: Array<{ action: SyncAction; error: string }>;
};

type SyncOptions = {
  dryRun?: boolean;
};

function getConfig(): { apiKey: string; appBaseUrl: string; cronSecret: string } {
  const apiKey = process.env.CRONJOB_ORG_API_KEY?.trim();
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const missing: string[] = [];
  if (!apiKey) missing.push("CRONJOB_ORG_API_KEY");
  if (!appBaseUrl) missing.push("APP_BASE_URL");
  if (!cronSecret) missing.push("CRON_SECRET");
  if (missing.length > 0) throw new CronSyncConfigError(missing);
  return { apiKey: apiKey!, appBaseUrl: appBaseUrl!, cronSecret: cronSecret! };
}

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function listAllJobs(apiKey: string): Promise<RemoteJobListItem[]> {
  const res = await fetchWithTimeout(`${API_BASE}/jobs`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`cron-job.org GET /jobs HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as { jobs?: RemoteJobListItem[] };
  return json.jobs ?? [];
}

async function createJob(apiKey: string, payload: object): Promise<number> {
  const res = await fetchWithTimeout(`${API_BASE}/jobs`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`cron-job.org PUT /jobs HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as { jobId: number };
  return json.jobId;
}

async function patchJob(apiKey: string, jobId: number, payload: object): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/jobs/${jobId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `cron-job.org PATCH /jobs/${jobId} HTTP ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
}

async function deleteJob(apiKey: string, jobId: number): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/jobs/${jobId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(
      `cron-job.org DELETE /jobs/${jobId} HTTP ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
}

// ── Diff puro (testeable sin red) ──────────────────────────────────────────

/**
 * Compara MANAGED_CRONS con la lista remota (filtrada al prefijo gestionado)
 * y devuelve el plan de acciones. NO ejecuta nada.
 */
export function planDiff(
  managed: ManagedCron[],
  remote: RemoteJobListItem[],
  options: { appBaseUrl: string; cronSecret: string },
): SyncAction[] {
  const remoteManaged: Array<{ name: string; job: RemoteJobListItem }> = [];
  for (const job of remote) {
    const name = extractManagedName(job.title);
    if (name) remoteManaged.push({ name, job });
  }

  const remoteByName = new Map(remoteManaged.map((m) => [m.name, m.job]));
  const managedByName = new Map(managed.map((c) => [c.name, c]));

  const actions: SyncAction[] = [];

  // Creates + updates + noops
  for (const cron of managed) {
    const expectedTitle = buildJobTitle(cron);
    const expectedUrl = buildJobUrl(cron, options);
    const remote = remoteByName.get(cron.name);

    if (!remote) {
      actions.push({ type: "create", cron, title: expectedTitle, url: expectedUrl });
      continue;
    }

    const reasons: string[] = [];
    if (remote.title !== expectedTitle) reasons.push("title");
    if (remote.url !== expectedUrl) reasons.push("url");
    if (remote.enabled !== cron.enabled) reasons.push("enabled");
    if (remote.schedule && !schedulesEqual(remote.schedule, cron.schedule)) {
      reasons.push("schedule");
    }

    if (reasons.length === 0) {
      actions.push({ type: "noop", jobId: remote.jobId, cron, title: expectedTitle });
    } else {
      actions.push({
        type: "update",
        jobId: remote.jobId,
        cron,
        title: expectedTitle,
        url: expectedUrl,
        reasons,
      });
    }
  }

  // Deletes — jobs remotos con prefijo pero sin entrada en código
  for (const { name, job } of remoteManaged) {
    if (!managedByName.has(name)) {
      actions.push({ type: "delete", jobId: job.jobId, title: job.title });
    }
  }

  return actions;
}

function schedulesEqual(a: CronSchedule, b: CronSchedule): boolean {
  return (
    a.timezone === b.timezone &&
    arraysEqual(a.minutes, b.minutes) &&
    arraysEqual(a.hours, b.hours) &&
    arraysEqual(a.mdays, b.mdays) &&
    arraysEqual(a.months, b.months) &&
    arraysEqual(a.wdays, b.wdays)
  );
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}

// ── Sync orquestador ───────────────────────────────────────────────────────

function buildJobPayload(cron: ManagedCron, url: string, title: string) {
  return {
    job: {
      url,
      enabled: cron.enabled,
      saveResponses: false,
      title,
      schedule: cron.schedule,
      requestTimeout: REQUEST_TIMEOUT_S,
      auth: { enable: false, user: "", password: "" },
      notification: { onFailure: true, onSuccess: false, onDisable: false },
    },
  };
}

export async function syncCrons(options: SyncOptions = {}): Promise<SyncResult> {
  const { apiKey, appBaseUrl, cronSecret } = getConfig();
  const remote = await listAllJobs(apiKey);
  const plan = planDiff(MANAGED_CRONS, remote, { appBaseUrl, cronSecret });

  if (options.dryRun) {
    return { plan, applied: false, errors: [] };
  }

  const errors: SyncResult["errors"] = [];
  let mutated = false;
  for (const action of plan) {
    try {
      if (action.type === "create") {
        if (mutated) await sleep(APPLY_THROTTLE_MS);
        await createJob(apiKey, buildJobPayload(action.cron, action.url, action.title));
        mutated = true;
      } else if (action.type === "update") {
        if (mutated) await sleep(APPLY_THROTTLE_MS);
        await patchJob(apiKey, action.jobId, buildJobPayload(action.cron, action.url, action.title));
        mutated = true;
      } else if (action.type === "delete") {
        if (mutated) await sleep(APPLY_THROTTLE_MS);
        await deleteJob(apiKey, action.jobId);
        mutated = true;
      }
      // noops no consumen rate limit (no tocan API).
    } catch (err) {
      errors.push({ action, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { plan, applied: true, errors };
}

// ── Limpieza de duplicados antiguos ─────────────────────────────────────────
// Identifica jobs en cron-job.org que NO tienen el prefijo [mw-sync] pero
// cuya URL apunta a uno de los paths gestionados. Son crons que el usuario
// (o yo, antes de tener sync) creó a mano y ahora son redundantes.

export type DuplicateJob = {
  jobId: number;
  title: string;
  url: string;
  matchedPath: string; // qué path managed se solapa
  matchedName: string; // qué managed name corresponde
};

export function findDuplicateJobs(
  managed: ManagedCron[],
  remote: RemoteJobListItem[],
): DuplicateJob[] {
  const duplicates: DuplicateJob[] = [];

  for (const job of remote) {
    // Sólo nos interesan jobs SIN prefijo gestionado.
    if (extractManagedName(job.title) !== null) continue;

    // ¿La URL del job remoto apunta a uno de los paths managed?
    let url: URL;
    try {
      url = new URL(job.url);
    } catch {
      continue;
    }

    for (const cron of managed) {
      if (url.pathname !== cron.path) continue;

      // Si el cron managed tiene params (ej. kind=health-daily), exigimos
      // que el job remoto los tenga TODOS iguales. Si no, son crons
      // distintos sobre el mismo endpoint y no es un duplicado.
      if (cron.params) {
        const paramsMatch = Object.entries(cron.params).every(
          ([k, v]) => url.searchParams.get(k) === v,
        );
        if (!paramsMatch) continue;
      }

      duplicates.push({
        jobId: job.jobId,
        title: job.title,
        url: job.url,
        matchedPath: cron.path,
        matchedName: cron.name,
      });
      break;
    }
  }

  return duplicates;
}

export type CleanupDuplicatesResult = {
  duplicates: DuplicateJob[];
  applied: boolean;
  deleted: number;
  errors: Array<{ jobId: number; title: string; error: string }>;
};

export async function cleanupDuplicateJobs(options: { dryRun?: boolean } = {}): Promise<CleanupDuplicatesResult> {
  const { apiKey } = getConfig();
  const remote = await listAllJobs(apiKey);
  const duplicates = findDuplicateJobs(MANAGED_CRONS, remote);

  if (options.dryRun || duplicates.length === 0) {
    return { duplicates, applied: false, deleted: 0, errors: [] };
  }

  const errors: CleanupDuplicatesResult["errors"] = [];
  let deleted = 0;
  let mutated = false;

  for (const dup of duplicates) {
    try {
      if (mutated) await sleep(APPLY_THROTTLE_MS);
      await deleteJob(apiKey, dup.jobId);
      mutated = true;
      deleted++;
    } catch (err) {
      errors.push({
        jobId: dup.jobId,
        title: dup.title,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { duplicates, applied: true, deleted, errors };
}

/**
 * Para tests / scripts ad-hoc: redacta la URL de un plan eliminando
 * el secret antes de logarlo.
 */
export function redactPlan(plan: SyncAction[]): unknown[] {
  return plan.map((a) => {
    if (a.type === "create" || a.type === "update") {
      const url = a.url.replace(/secret=[^&]+/, "secret=***");
      return { ...a, url };
    }
    return a;
  });
}
