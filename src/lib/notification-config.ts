import fs from "fs/promises";
import path from "path";

export type NotificationConfig = {
  emailNewUser: boolean;
  emailCrisis: boolean;
  emailRetentionDrop: boolean;
  emailWeeklySummary: boolean;
  emailAvoidanceEscalation: boolean;
  telegramNewUser: boolean;
  telegramCrisis: boolean;
  telegramUserMessages: boolean;
  telegramWeeklySummary: boolean;
  telegramAvoidanceEscalation: boolean;
  cronDailyCheckin: boolean;
  cronWeeklyReview: boolean;
  cronWeeklyInactiveReminder: boolean;
  cronActionReminders: boolean;
  cronInactivityCheck: boolean;
  cronProactiveReview: boolean;
};

const DEFAULTS: NotificationConfig = {
  emailNewUser: true,
  emailCrisis: true,
  emailRetentionDrop: true,
  emailWeeklySummary: true,
  emailAvoidanceEscalation: true,
  telegramNewUser: true,
  telegramCrisis: true,
  telegramUserMessages: true,
  telegramWeeklySummary: true,
  telegramAvoidanceEscalation: true,
  cronDailyCheckin: true,
  cronWeeklyReview: true,
  cronWeeklyInactiveReminder: true,
  cronActionReminders: true,
  cronInactivityCheck: true,
  cronProactiveReview: true,
};

const CONFIG_PATH = path.join(process.cwd(), "notification-config.json");

let cached: NotificationConfig | null = null;
let cachedAt = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getNotificationConfig(): Promise<NotificationConfig> {
  if (cached && Date.now() - cachedAt < CACHE_TTL) return cached;
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    cached = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    cached = { ...DEFAULTS };
  }
  cachedAt = Date.now();
  return cached;
}

export function isEnabled(config: NotificationConfig, key: keyof NotificationConfig): boolean {
  return config[key] ?? true;
}
