import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 10 * 60;

type TelegramLinkPayload = {
  typ: "tg_link";
  tgUserId: string;
  iat: number;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TOKEN_SECRET is required in production");
  }

  return process.env.SESSION_SECRET?.trim() || "dev-insecure-telegram-link-secret";
}

function sign(input: string): string {
  return createHmac("sha256", getSecret()).update(input).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function issueTelegramLinkToken(telegramUserId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TelegramLinkPayload = {
    typ: "tg_link",
    tgUserId: telegramUserId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

// ─── Web → Telegram link (user signs up on web, clicks deep link to connect bot) ──

type WebLinkPayload = {
  typ: "web_link";
  userId: string;
  iat: number;
  exp: number;
};

export function issueWebLinkToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: WebLinkPayload = {
    typ: "web_link",
    userId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyWebLinkToken(token: string): WebLinkPayload {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("INVALID_LINK_TOKEN");

  const expectedSignature = sign(encoded);
  if (!safeEqual(expectedSignature, signature)) throw new Error("INVALID_LINK_TOKEN");

  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8")
  ) as WebLinkPayload;
  if (payload.typ !== "web_link" || !payload.userId) throw new Error("INVALID_LINK_TOKEN");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error("EXPIRED_LINK_TOKEN");

  return payload;
}

// ─── Telegram → Web link (user types /vincular in bot) ──

export function verifyTelegramLinkToken(token: string): TelegramLinkPayload {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new Error("INVALID_LINK_TOKEN");
  }

  const expectedSignature = sign(encoded);
  if (!safeEqual(expectedSignature, signature)) {
    throw new Error("INVALID_LINK_TOKEN");
  }

  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8")
  ) as TelegramLinkPayload;
  if (payload.typ !== "tg_link" || !payload.tgUserId) {
    throw new Error("INVALID_LINK_TOKEN");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error("EXPIRED_LINK_TOKEN");
  }

  return payload;
}
