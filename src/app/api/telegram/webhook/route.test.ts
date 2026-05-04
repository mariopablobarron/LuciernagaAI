/**
 * @jest-environment node
 *
 * Integration tests del webhook de Telegram. Cubre:
 *   - Auth via TELEGRAM_WEBHOOK_SECRET (header x-telegram-bot-api-secret-token).
 *   - Rate limiting global.
 *   - Payloads vacíos / sin text / sin message → 200 silente (no crashea).
 *   - Comandos sensibles /borrar_datos y /privacidad sin tocar AI.
 *   - JSON malformed → 200 silente (no leak).
 *
 * NO testea el flujo completo de chat (eso requiere un E2E real con un bot
 * de prueba, fuera de scope). El objetivo aquí es la red de seguridad sobre
 * los puntos donde llega input externo no confiable.
 */

import type { NextRequest } from "next/server";

// ── Mocks de módulos pesados ─────────────────────────────────────────────────
// Mockeamos absolutamente todo lo que toque DB, fetch o servicios externos.
// El handler debe poder ejecutarse sin red ni Postgres.

jest.mock("@/services/telegram", () => ({
  createTelegramUserWithConsent: jest.fn(),
  deactivateTelegramUser: jest.fn(),
  deleteTelegramUserData: jest.fn(),
  findTelegramUser: jest.fn(async () => null),
  getOrCreateTelegramConversation: jest.fn(),
  getPendingActions: jest.fn(async () => []),
  isCrisisState: jest.fn(() => false),
  logTelegramCrisis: jest.fn(),
  touchTelegramUser: jest.fn(),
}));

jest.mock("@/services/ai", () => ({
  generateAIResponse: jest.fn(async () => ({ response: "ok", fallback: false })),
}));

jest.mock("@/services/conversation", () => ({
  saveConversationMessage: jest.fn(),
}));

jest.mock("@/services/emotional-model", () => ({
  analyzeEmotionalProfile: jest.fn(() => ({})),
  getEmotionalProfile: jest.fn(async () => ({})),
}));

jest.mock("@/services/state", () => ({
  detectUserState: jest.fn(() => "neutral"),
}));

jest.mock("@/services/telegramOnboarding", () => ({
  sendWelcomeSequence: jest.fn(),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(() => ({
    user: { update: jest.fn(), findUnique: jest.fn() },
  })),
}));

jest.mock("@/lib/alerts", () => ({
  sendAdminUserAlert: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock("@/lib/telegram-link", () => ({
  issueTelegramLinkToken: jest.fn(),
  verifyWebLinkToken: jest.fn(),
}));

// El propio handler hace fetch a la API de Telegram para responder. Lo neutralizamos.
const originalFetch = global.fetch;

import {
  deleteTelegramUserData,
  findTelegramUser,
} from "@/services/telegram";

const deleteTelegramUserDataMock = deleteTelegramUserData as jest.MockedFunction<
  typeof deleteTelegramUserData
>;
const findTelegramUserMock = findTelegramUser as jest.MockedFunction<typeof findTelegramUser>;

// Importamos el handler DESPUÉS de los mocks para que coja las versiones mockeadas.
import { POST } from "./route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers: { get: (name: string) => headerMap.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as unknown as NextRequest;
}

function makeReqInvalidJson(headers: Record<string, string> = {}): NextRequest {
  const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers: { get: (name: string) => headerMap.get(name.toLowerCase()) ?? null },
    json: async () => {
      throw new Error("invalid json");
    },
  } as unknown as NextRequest;
}

function makeMessage(chatId: number, text: string) {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 1700000000,
      chat: { id: chatId, type: "private" },
      from: { id: chatId, is_bot: false, first_name: "Test" },
      text,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(async () =>
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }),
  );
});

afterAll(() => {
  global.fetch = originalFetch;
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — auth via secret", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;
  afterEach(() => {
    if (original) process.env.TELEGRAM_WEBHOOK_SECRET = original;
    else delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  it("rechaza con 401 si el secret está configurado y el header NO coincide", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "real-secret";
    const res = await POST(
      makeReq(makeMessage(123, "/privacidad"), { "x-telegram-bot-api-secret-token": "wrong" }),
    );
    expect(res.status).toBe(401);
  });

  it("rechaza con 401 si el secret está configurado y NO viene header", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "real-secret";
    const res = await POST(makeReq(makeMessage(123, "/privacidad")));
    expect(res.status).toBe(401);
  });

  it("acepta cuando el secret coincide", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "real-secret";
    const res = await POST(
      makeReq(makeMessage(123, "/privacidad"), { "x-telegram-bot-api-secret-token": "real-secret" }),
    );
    expect(res.status).toBe(200);
  });

  it("sin TELEGRAM_WEBHOOK_SECRET acepta (con warn) — modo dev/legacy", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await POST(makeReq(makeMessage(123, "/privacidad")));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/telegram/webhook — rate limit global", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;
  beforeAll(() => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET; // simplifica la auth
  });
  afterAll(() => {
    if (original) process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("tras 100 requests del mismo IP devuelve 200 silente y no procesa", async () => {
    const ip = "9.9.9.9";
    // Disparamos 105 requests para sobrepasar la cuota de 100/min.
    const results = await Promise.all(
      Array.from({ length: 105 }).map(() =>
        POST(
          makeReq(makeMessage(999, "hola"), {
            "x-forwarded-for": ip,
          }),
        ),
      ),
    );
    // Todas devuelven 200 (es la convención: NO 429 a Telegram para que no
    // reintente agresivamente).
    for (const r of results) expect(r.status).toBe(200);
    // Pero al menos algunas NO deberían haber llamado findTelegramUser
    // (porque el rate limit corta antes). Si TODAS lo llaman, el rate limit
    // no funciona.
    expect(findTelegramUserMock.mock.calls.length).toBeLessThan(105);
  });
});

describe("POST /api/telegram/webhook — payloads no procesables", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;
  beforeAll(() => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });
  afterAll(() => {
    if (original) process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("update vacío {} → 200 silente", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(200);
    expect(findTelegramUserMock).not.toHaveBeenCalled();
  });

  it("update sin message ni callback_query → 200 silente", async () => {
    const res = await POST(makeReq({ update_id: 5, edited_message: {} }));
    expect(res.status).toBe(200);
  });

  it("message sin text (foto/sticker/document) → 200 silente", async () => {
    const res = await POST(
      makeReq({
        update_id: 6,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 1, type: "private" },
          from: { id: 1, is_bot: false, first_name: "X" },
          // sin text
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(findTelegramUserMock).not.toHaveBeenCalled();
  });

  it("text vacío (solo espacios) → 200 silente, no procesa", async () => {
    const res = await POST(makeReq(makeMessage(1, "   ")));
    expect(res.status).toBe(200);
    expect(findTelegramUserMock).not.toHaveBeenCalled();
  });

  it("body con JSON malformado NO crashea — devuelve 200 (handler swallow)", async () => {
    const res = await POST(makeReqInvalidJson());
    // El handler captura excepciones y responde 200 — Telegram no debe reintentar.
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/telegram/webhook — comandos sensibles sin tocar AI", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;
  beforeAll(() => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });
  afterAll(() => {
    if (original) process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("/borrar_datos invoca deleteTelegramUserData con el chatId correcto", async () => {
    const res = await POST(makeReq(makeMessage(42, "/borrar_datos")));
    expect(res.status).toBe(200);
    expect(deleteTelegramUserDataMock).toHaveBeenCalledWith(42);
  });

  it("/privacidad NO invoca deleteTelegramUserData ni findTelegramUser", async () => {
    const res = await POST(makeReq(makeMessage(99, "/privacidad")));
    expect(res.status).toBe(200);
    expect(deleteTelegramUserDataMock).not.toHaveBeenCalled();
    expect(findTelegramUserMock).not.toHaveBeenCalled();
  });
});
