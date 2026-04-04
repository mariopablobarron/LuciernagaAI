/**
 * Central environment validation.
 * Call validateEnv() once at startup (layout.tsx server side) to fail fast
 * if any critical variable is missing, instead of getting cryptic runtime errors.
 */

// ─── Typed config ─────────────────────────────────────────────────────────────

export type AppConfig = {
  DATABASE_URL: string;
  AUTH_TOKEN_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  OPENROUTER_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  ADMIN_TELEGRAM_ID: string;
  APP_BASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_PRO_MONTHLY: string;
  STRIPE_PRICE_PRO_ANNUAL: string;
};

// Required in every environment
const REQUIRED_VARS: (keyof AppConfig)[] = [
  "DATABASE_URL",
  "AUTH_TOKEN_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "OPENROUTER_API_KEY",
];

// Required in production only (warn in dev)
const REQUIRED_IN_PRODUCTION: (keyof AppConfig)[] = [
  "TELEGRAM_BOT_TOKEN",
  "ADMIN_TELEGRAM_ID",
  "APP_BASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_ANNUAL",
];

function readVar(name: keyof AppConfig): string {
  return process.env[name]?.trim() ?? "";
}

// ─── Startup validation ───────────────────────────────────────────────────────

/**
 * Validates all critical env vars and throws a single descriptive error
 * listing every missing variable. Call once at app startup.
 */
export function validateEnv(): void {
  // Skip during Next.js build phase — env vars are injected at runtime by Coolify,
  // not available when the image is being compiled.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const isProd = process.env.NODE_ENV === "production";
  const toCheck = isProd
    ? [...REQUIRED_VARS, ...REQUIRED_IN_PRODUCTION]
    : REQUIRED_VARS;

  const missing = toCheck.filter((name) => !readVar(name));

  if (missing.length === 0) return;

  const list = missing.map((v) => `  • ${v}`).join("\n");
  const msg = `[ENV] Missing required environment variables:\n${list}\n\nSet them in .env.local (dev) or Coolify (prod).`;

  if (isProd) {
    throw new Error(msg);
  } else {
    // In development, warn but don't crash — allows partial local setup
    console.warn(msg);
  }
}

// ─── Typed accessor ───────────────────────────────────────────────────────────

/**
 * Returns a typed config object. Throws on first missing required var.
 * Use for server-side code that needs a specific variable.
 */
export function getConfig(): AppConfig {
  function require(name: keyof AppConfig): string {
    const val = readVar(name);
    if (!val) throw new Error(`[ENV] Missing environment variable: ${name}`);
    return val;
  }

  function optional(name: keyof AppConfig, fallback = ""): string {
    return readVar(name) || fallback;
  }

  return {
    DATABASE_URL: require("DATABASE_URL"),
    AUTH_TOKEN_SECRET: require("AUTH_TOKEN_SECRET"),
    ADMIN_USERNAME: require("ADMIN_USERNAME"),
    ADMIN_PASSWORD: require("ADMIN_PASSWORD"),
    OPENROUTER_API_KEY: require("OPENROUTER_API_KEY"),
    TELEGRAM_BOT_TOKEN: optional("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_BOT_USERNAME: optional("TELEGRAM_BOT_USERNAME"),
    ADMIN_TELEGRAM_ID: optional("ADMIN_TELEGRAM_ID"),
    APP_BASE_URL: optional("APP_BASE_URL", "http://localhost:3000"),
    STRIPE_SECRET_KEY: optional("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: optional("STRIPE_WEBHOOK_SECRET"),
    STRIPE_PRICE_PRO_MONTHLY: optional("STRIPE_PRICE_PRO_MONTHLY"),
    STRIPE_PRICE_PRO_ANNUAL: optional("STRIPE_PRICE_PRO_ANNUAL"),
  };
}
