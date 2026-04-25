// Tests unitarios del diff (planDiff). No tocan red ni cron-job.org.

import { planDiff, redactPlan } from "./cronSync";
import {
  buildJobTitle,
  buildJobUrl,
  type ManagedCron,
} from "@/lib/cronJobs";

const OPTIONS = {
  appBaseUrl: "https://example.com",
  cronSecret: "TESTSECRET",
};

const sampleCron: ManagedCron = {
  name: "capsule-snapshot",
  description: "Cápsula del tiempo · genera snapshots diarios",
  path: "/api/cron/capsule-snapshot",
  schedule: {
    minutes: [0],
    hours: [4],
    mdays: [-1],
    months: [-1],
    wdays: [-1],
    timezone: "Europe/Madrid",
  },
  enabled: true,
};

const sampleCronWithParams: ManagedCron = {
  name: "admin-report-health",
  description: "Reporte diario de salud",
  path: "/api/cron/admin-report",
  params: { kind: "health-daily" },
  schedule: {
    minutes: [0],
    hours: [8],
    mdays: [-1],
    months: [-1],
    wdays: [-1],
    timezone: "Europe/Madrid",
  },
  enabled: true,
};

describe("planDiff — creates", () => {
  it("crea cuando el cron no existe en remoto", () => {
    const plan = planDiff([sampleCron], [], OPTIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("create");
    if (plan[0].type === "create") {
      expect(plan[0].title).toBe(buildJobTitle(sampleCron));
      expect(plan[0].url).toBe(buildJobUrl(sampleCron, OPTIONS));
    }
  });

  it("incluye search params del cron en la URL generada", () => {
    const plan = planDiff([sampleCronWithParams], [], OPTIONS);
    if (plan[0].type !== "create") throw new Error("expected create");
    expect(plan[0].url).toContain("kind=health-daily");
    expect(plan[0].url).toContain("secret=TESTSECRET");
  });
});

describe("planDiff — noop", () => {
  it("no cambios cuando remoto coincide exactamente", () => {
    const remote = [
      {
        jobId: 100,
        enabled: true,
        title: buildJobTitle(sampleCron),
        url: buildJobUrl(sampleCron, OPTIONS),
        schedule: sampleCron.schedule,
      },
    ];
    const plan = planDiff([sampleCron], remote, OPTIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("noop");
  });
});

describe("planDiff — updates", () => {
  it("update si la URL es distinta (ej. cambió secret o path)", () => {
    const remote = [
      {
        jobId: 100,
        enabled: true,
        title: buildJobTitle(sampleCron),
        url: "https://example.com/api/cron/capsule-snapshot?secret=OLDSECRET",
        schedule: sampleCron.schedule,
      },
    ];
    const plan = planDiff([sampleCron], remote, OPTIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("update");
    if (plan[0].type === "update") {
      expect(plan[0].reasons).toContain("url");
      expect(plan[0].jobId).toBe(100);
    }
  });

  it("update si schedule cambió", () => {
    const remote = [
      {
        jobId: 101,
        enabled: true,
        title: buildJobTitle(sampleCron),
        url: buildJobUrl(sampleCron, OPTIONS),
        schedule: { ...sampleCron.schedule, hours: [5] }, // antes era 4
      },
    ];
    const plan = planDiff([sampleCron], remote, OPTIONS);
    if (plan[0].type !== "update") throw new Error("expected update");
    expect(plan[0].reasons).toContain("schedule");
  });

  it("update si enabled cambió", () => {
    const remote = [
      {
        jobId: 102,
        enabled: false,
        title: buildJobTitle(sampleCron),
        url: buildJobUrl(sampleCron, OPTIONS),
        schedule: sampleCron.schedule,
      },
    ];
    const plan = planDiff([sampleCron], remote, OPTIONS);
    if (plan[0].type !== "update") throw new Error("expected update");
    expect(plan[0].reasons).toContain("enabled");
  });

  it("update si description (que va en title) cambió", () => {
    const remote = [
      {
        jobId: 103,
        enabled: true,
        title: "[mw-sync] capsule-snapshot — descripción vieja",
        url: buildJobUrl(sampleCron, OPTIONS),
        schedule: sampleCron.schedule,
      },
    ];
    const plan = planDiff([sampleCron], remote, OPTIONS);
    if (plan[0].type !== "update") throw new Error("expected update");
    expect(plan[0].reasons).toContain("title");
  });
});

describe("planDiff — deletes", () => {
  it("borra jobs huérfanos (en remoto con prefijo, sin entrada en código)", () => {
    const remote = [
      {
        jobId: 200,
        enabled: true,
        title: "[mw-sync] obsolete-cron — algo viejo",
        url: "https://example.com/api/cron/obsolete?secret=X",
        schedule: sampleCron.schedule,
      },
    ];
    const plan = planDiff([], remote, OPTIONS);
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("delete");
    if (plan[0].type === "delete") expect(plan[0].jobId).toBe(200);
  });

  it("NO toca jobs sin el prefijo gestionado", () => {
    const remote = [
      {
        jobId: 300,
        enabled: true,
        title: "Mi cron a mano",
        url: "https://example.com/api/cron/whatever",
        schedule: sampleCron.schedule,
      },
    ];
    const plan = planDiff([], remote, OPTIONS);
    expect(plan).toHaveLength(0);
  });
});

describe("planDiff — combinado", () => {
  it("mezcla create + noop + update + delete en mismo plan", () => {
    const second: ManagedCron = { ...sampleCron, name: "other-cron", description: "otro" };
    const third: ManagedCron = { ...sampleCron, name: "third-cron", description: "tercero" };

    const remote = [
      // Coincide → noop
      {
        jobId: 1,
        enabled: true,
        title: buildJobTitle(sampleCron),
        url: buildJobUrl(sampleCron, OPTIONS),
        schedule: sampleCron.schedule,
      },
      // existe pero schedule cambió → update
      {
        jobId: 2,
        enabled: true,
        title: buildJobTitle(second),
        url: buildJobUrl(second, OPTIONS),
        schedule: { ...second.schedule, hours: [99] },
      },
      // huérfano → delete
      {
        jobId: 3,
        enabled: true,
        title: "[mw-sync] orphan — viejo",
        url: "https://example.com/api/cron/orphan",
        schedule: sampleCron.schedule,
      },
    ];

    const plan = planDiff([sampleCron, second, third], remote, OPTIONS);
    const types = plan.map((a) => a.type).sort();
    expect(types).toEqual(["create", "delete", "noop", "update"]);
  });
});

describe("redactPlan", () => {
  it("oculta el secret en URLs de creates y updates", () => {
    const plan = planDiff([sampleCron], [], OPTIONS);
    const redacted = redactPlan(plan) as Array<{ url?: string }>;
    expect(redacted[0].url).not.toContain("TESTSECRET");
    expect(redacted[0].url).toContain("secret=***");
  });
});
