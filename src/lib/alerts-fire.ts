import { sendAutomatedAlert } from "@/lib/alerts";

type LogEntry = {
  level: "info" | "warn" | "error";
  tag: string;
  message: string;
  stack?: string;
};

type Rule = {
  id: string;
  name: string;
  level: string;
  tagPattern: string | null;
  messagePattern: string | null;
  channel: string;
  throttleMinutes: number;
  lastFiredAt: Date | null;
};

const CACHE_TTL_MS = 60_000;
let rulesCache: Rule[] = [];
let rulesCachedAt = 0;
let refreshing = false;

async function loadRules(): Promise<Rule[]> {
  const now = Date.now();
  if (!refreshing && now - rulesCachedAt < CACHE_TTL_MS && rulesCache.length > 0) {
    return rulesCache;
  }
  if (refreshing) return rulesCache;
  refreshing = true;
  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    const rows = await prisma.alertRule.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        level: true,
        tagPattern: true,
        messagePattern: true,
        channel: true,
        throttleMinutes: true,
        lastFiredAt: true,
      },
    });
    rulesCache = rows;
    rulesCachedAt = now;
  } catch {
    // en caso de fallo, mantener cache previa
  } finally {
    refreshing = false;
  }
  return rulesCache;
}

export function invalidateAlertRulesCache(): void {
  rulesCachedAt = 0;
}

function matches(rule: Rule, entry: LogEntry): boolean {
  if (rule.level !== "any" && rule.level !== entry.level) return false;
  if (rule.tagPattern && !entry.tag.toLowerCase().includes(rule.tagPattern.toLowerCase())) {
    return false;
  }
  if (rule.messagePattern && !entry.message.toLowerCase().includes(rule.messagePattern.toLowerCase())) {
    return false;
  }
  return true;
}

function isThrottled(rule: Rule): boolean {
  if (!rule.lastFiredAt) return false;
  const elapsedMs = Date.now() - rule.lastFiredAt.getTime();
  return elapsedMs < rule.throttleMinutes * 60_000;
}

type FiringRecord = {
  level: "critical" | "warning" | "info";
  channel: string;
  title: string;
  message: string;
  tag: string | null;
  delivered: boolean;
  errorReason?: string;
};

const FIRING_MESSAGE_MAX = 1000;

async function markFired(rule: Rule, firing: FiringRecord): Promise<void> {
  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    const ops: Promise<unknown>[] = [
      // Bump aggregates only on real deliveries; deduped/cooldown firings still
      // get a row in AlertFiring (with delivered=false) for forensic value but
      // they shouldn't push lastFiredAt forward.
      firing.delivered
        ? prisma.alertRule.update({
            where: { id: rule.id },
            data: {
              lastFiredAt: new Date(),
              firedCount: { increment: 1 },
            },
          })
        : Promise.resolve(),
      prisma.alertFiring.create({
        data: {
          ruleId: rule.id,
          level: firing.level,
          channel: firing.channel,
          title: firing.title.slice(0, 500),
          message: firing.message.slice(0, FIRING_MESSAGE_MAX),
          tag: firing.tag ?? null,
          delivered: firing.delivered,
          errorReason: firing.errorReason ?? null,
        },
      }),
    ];
    await Promise.all(ops);
    if (firing.delivered) rule.lastFiredAt = new Date();
  } catch {
    // silent — alert path must never crash log enqueue
  }
}

export async function evaluateLogForAlerts(entry: LogEntry): Promise<void> {
  if (entry.level !== "warn" && entry.level !== "error") return;

  const rules = await loadRules();
  if (rules.length === 0) return;

  for (const rule of rules) {
    if (!matches(rule, entry)) continue;
    if (isThrottled(rule)) continue;

    const level: "critical" | "warning" =
      entry.level === "error" ? "critical" : "warning";
    const title = `[${entry.tag}] ${rule.name}`;
    const message =
      entry.message.slice(0, 500) +
      (entry.stack ? `\n\nStack:\n${entry.stack.slice(0, 800)}` : "");

    // Fire-and-forget — no bloqueamos el enqueueLog principal
    void (async () => {
      try {
        const delivered = await sendAutomatedAlert(
          { type: level, title, message },
          {
            dedupeKey: `alert-rule:${rule.id}`,
            cooldownMs: rule.throttleMinutes * 60_000,
          },
        );
        await markFired(rule, {
          level,
          channel: rule.channel,
          title,
          message,
          tag: entry.tag,
          delivered,
          errorReason: delivered ? undefined : "deduped_or_cooldown",
        });
      } catch {
        // ya se habrá logueado en sendAlert; evitamos bucle
      }
    })();
  }
}
