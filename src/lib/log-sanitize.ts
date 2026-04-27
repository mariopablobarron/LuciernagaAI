const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 2000;
const MAX_DEPTH = 6;

const SENSITIVE_KEY_PARTS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "bearer",
  "session",
  "refresh",
  "privatekey",
  "private_key",
  "creditcard",
  "credit_card",
  "cardnumber",
  "card_number",
  "cvv",
  "ssn",
  "dni",
  "email",
  "mail",
  "phone",
  "telegramid",
  "telegram_id",
  "prompt",
  "usermessage",
  "user_message",
  "userinput",
  "user_input",
  "messagetext",
  "message_text",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return value.slice(0, MAX_STRING_LENGTH) + `…[+${value.length - MAX_STRING_LENGTH}]`;
}

function sanitizeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
  parentKeyIsSensitive: boolean,
): unknown {
  if (parentKeyIsSensitive) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }
  if (depth >= MAX_DEPTH) return "[depth-limit]";

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    return value.map((v) => sanitizeValue(v, depth + 1, seen, false));
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v, depth + 1, seen, isSensitiveKey(k));
    }
    return out;
  }

  return String(value);
}

export function sanitizeMeta(
  meta: Record<string, unknown> | undefined | null,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const seen = new WeakSet<object>();
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    result[k] = sanitizeValue(v, 1, seen, isSensitiveKey(k));
  }
  return result;
}
