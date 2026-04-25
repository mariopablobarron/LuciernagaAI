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
  for (const action of plan) {
    try {
      if (action.type === "create") {
        await createJob(apiKey, buildJobPayload(action.cron, action.url, action.title));
      } else if (action.type === "update") {
        await patchJob(apiKey, action.jobId, buildJobPayload(action.cron, action.url, action.title));
      } else if (action.type === "delete") {
        await deleteJob(apiKey, action.jobId);
      }
    } catch (err) {
      errors.push({ action, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { plan, applied: true, errors };
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
