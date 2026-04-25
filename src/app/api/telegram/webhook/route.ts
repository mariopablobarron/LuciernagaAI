import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { generateAIResponse } from "@/services/ai";
import { saveConversationMessage } from "@/services/conversation";
import { analyzeEmotionalProfile, getEmotionalProfile } from "@/services/emotional-model";
import { detectUserState } from "@/services/state";
import {
  createTelegramUserWithConsent,
  deactivateTelegramUser,
  deleteTelegramUserData,
  findTelegramUser,
  getOrCreateTelegramConversation,
  getPendingActions,
  isCrisisState,
  logTelegramCrisis,
  touchTelegramUser,
} from "@/services/telegram";
import { issueTelegramLinkToken, verifyWebLinkToken } from "@/lib/telegram-link";
import { sendAdminUserAlert } from "@/lib/alerts";
import { sendWelcomeSequence } from "@/services/telegramOnboarding";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";
import { getPrismaClient } from "@/db/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { buildWeeklyLetterSummaryMessage } from "@/lib/weekly-letter-summary";
import { buildDeployMessage } from "@/lib/admin-tg/deploy-info";
import { buildLlmCostMessage } from "@/lib/admin-tg/llm-cost-summary";
import { buildUserSearchMessage } from "@/lib/admin-tg/user-search";
import { buildRevenueMessage } from "@/lib/admin-tg/revenue-summary";
import { buildHealthMessage } from "@/lib/admin-tg/health-summary";
import { handleCallbackQuery, isAdminFrom } from "@/lib/admin-tg/callback-router";
import { sendTelegramWithButtons } from "@/lib/admin-tg/telegram-utils";

// ---- Telegram types ----

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: { chat: { id: number }; message_id: number };
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// ---- Constants ----

const TELEGRAM_API = "https://api.telegram.org";

const SAFETY_KEYWORDS = [
  "suicid",
  "matarme",
  "quitarme la vida",
  "no quiero vivir",
  "quiero morir",
  "hacerme daño",
  "me voy a hacer daño",
  "no vale la pena vivir",
];

const SAFETY_RESPONSE = `Lo que me estás contando es muy serio y quiero que sepas que no estás solo/a.

📞 LLAMA AHORA AL 024 📞
(Línea de atención a la conducta suicida — España, 24h, gratuita)

Otros países:
🆘 México: 800 290 0024 (SAPTEL)
🆘 Argentina: (011) 5275-1135 (Centro de Asistencia al Suicida)

Si estás en peligro inmediato, llama al número de emergencias de tu país (112 / 911).

Estoy aquí, pero esto necesita atención humana ahora.`;

const CONSENT_MESSAGE = `Antes de empezar necesito tu consentimiento.

Este asistente utiliza inteligencia artificial para acompañarte en decisiones personales.

🔹 Tus datos serán tratados de forma confidencial
🔹 Puedes dejar de usarlo en cualquier momento
🔹 No sustituye ayuda profesional

Consulta la política: ${process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es"}/privacidad

Escribe ACEPTO para continuar.`;

const PRIVACY_MESSAGE = `📋 *Política de privacidad*

Tus mensajes se almacenan de forma segura para mantener la continuidad de la conversación.

🔹 No compartimos tu información con terceros
🔹 Puedes eliminar todos tus datos en cualquier momento
🔹 Para borrar tus datos escribe: /borrar_datos
🔹 Para desactivar recordatorios escribe: /salir

Más información: ${process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es"}/privacidad`;

const WELCOME_MESSAGE = "Gracias. Ya puedes comenzar. ¿Qué te preocupa ahora mismo?";

const DELETE_CONFIRM_MESSAGE =
  "✅ Todos tus datos han sido eliminados. Si quieres volver a usar el asistente escríbeme cuando quieras.";

const DELETE_ERROR_MESSAGE =
  "No se pudieron eliminar tus datos en este momento. Inténtalo más tarde o contacta con soporte.";

const SALIR_MESSAGE =
  "👋 Entendido. Has desactivado los recordatorios. Estaré aquí cuando quieras retomar.";

function buildTelegramLinkMessage(token: string): string {
  const baseUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
  const url = `${baseUrl}/?telegram_link=${encodeURIComponent(token)}`;

  return [
    "Para conectar Telegram con tu cuenta web, abre este enlace en tu navegador:",
    "",
    url,
    "",
    "Este enlace vence en 10 minutos.",
  ].join("\n");
}

// ---- Admin command helpers ----

function isAdmin(chatId: number): boolean {
  const adminId = process.env.ADMIN_TELEGRAM_ID?.trim();
  return !!adminId && chatId.toString() === adminId;
}

async function buildStatsMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeToday, newToday, messagesTotal, stateRows] = await Promise.all([
    prisma.user.count({ where: { lastSeen: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.message.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.userState.groupBy({
      by: ["state"],
      _count: { state: true },
      orderBy: { _count: { state: "desc" } },
    }),
  ]);

  const stateLines = stateRows
    .map((r) => `  ${r.state}: ${r._count.state}`)
    .join("\n");

  return [
    `📊 *Stats del día*`,
    `Activos: ${activeToday} | Nuevos: ${newToday} | Mensajes: ${messagesTotal}`,
    "",
    `🧠 Estados:`,
    stateLines || "  Sin datos",
  ].join("\n");
}

async function buildUsuariosMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { lastSeen: { gte: since } },
    select: { id: true, source: true, lastSeen: true },
    orderBy: { lastSeen: "desc" },
    take: 20,
  });

  if (users.length === 0) return "Sin usuarios activos en las últimas 24h.";

  const lines = users.map(
    (u) =>
      `• \`${u.id}\` [${u.source ?? "web"}] — ${u.lastSeen.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
  );
  return `👥 *Activos (24h)* — ${users.length} usuarios\n\n${lines.join("\n")}`;
}

async function buildCrisisMessage(): Promise<string> {
  const prisma = getPrismaClient();

  const rows = await prisma.userState.findMany({
    where: { crisisActive: true },
    select: { userId: true, state: true, crisisActivatedAt: true },
    orderBy: { crisisActivatedAt: "desc" },
    take: 15,
  });

  if (rows.length === 0) return "✅ Sin usuarios en crisis activa ahora mismo.";

  const lines = rows.map(
    (r) =>
      `• \`${r.userId}\` — ${r.state}` +
      (r.crisisActivatedAt
        ? ` (desde ${r.crisisActivatedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })})`
        : "")
  );
  return `🚨 *Crisis activas* — ${rows.length}\n\n${lines.join("\n")}`;
}

async function buildRetentionMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeWeek, waitlist, challenges] = await Promise.all([
    prisma.user.count(),
    prisma.message.findMany({
      where: { createdAt: { gte: since }, role: "user" },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.waitlistEntry.count({ where: { status: "approved" } }),
    prisma.streak.count({ where: { status: "active", updatedAt: { gte: since } } }),
  ]);

  return [
    `📈 *Retención rápida*`,
    `Usuarios totales: ${totalUsers}`,
    `Activos esta semana: ${activeWeek.length} (${totalUsers > 0 ? Math.round((activeWeek.length / totalUsers) * 100) : 0}%)`,
    `Waitlist aprobados: ${waitlist}`,
    `Rachas activas (7d): ${challenges}`,
  ].join("\n");
}

async function buildTasksMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const tasks = await prisma.adminTask.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  if (tasks.length === 0) return "✅ Sin tareas pendientes.";

  const lines = tasks.map(
    (t, i) => `${i + 1}. [${t.id.slice(-6)}] ${t.instruction.slice(0, 80)}${t.instruction.length > 80 ? "…" : ""}`
  );
  return `📋 *Tareas pendientes* (${tasks.length})\n\n${lines.join("\n")}\n\nEjecuta con: npm run tg-tasks`;
}

async function sendLongTelegramMessage(chatId: number, text: string): Promise<void> {
  const MAX_LENGTH = 4000; // Telegram limit is 4096, leave margin
  if (text.length <= MAX_LENGTH) {
    await sendTelegramMessage(chatId, text);
    return;
  }
  // Split by paragraphs, then by hard limit
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > MAX_LENGTH && current) {
      chunks.push(current.trim());
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  for (const chunk of chunks) {
    await sendTelegramMessage(chatId, chunk);
  }
}

async function callAdminAI(question: string): Promise<string> {
  // Prefer Anthropic API (Opus with thinking), fall back to OpenRouter
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!anthropicKey && !openrouterKey) return "❌ Ni ANTHROPIC_API_KEY ni OPENROUTER_API_KEY configurada.";

  const prisma = getPrismaClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeToday, active7d, messagesTotal, messages7d, activeStreaks, waitlist, crisisEvents, proUsers, goalsActive] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeen: { gte: startOfDay } } }),
    prisma.user.count({ where: { lastSeen: { gte: sevenDaysAgo } } }),
    prisma.message.count({ where: { createdAt: { gte: startOfDay }, role: "user" } }),
    prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo }, role: "user" } }),
    prisma.streak.count({ where: { status: "active" } }),
    prisma.waitlistEntry.count({ where: { status: "approved" } }),
    prisma.crisisEvent.count({ where: { createdAt: { gte: sevenDaysAgo }, level: { in: ["high", "critical"] } } }),
    prisma.subscription.count({ where: { plan: "pro", status: "active" } }),
    prisma.goal.count({ where: { status: "active" } }),
  ]);

  const systemPrompt = [
    "Eres el co-piloto técnico y estratégico de Tres Mil Millones de Latidos.",
    "Razona en profundidad antes de responder. Analiza el problema desde varios ángulos. Piensa paso a paso.",
    "",
    "PRODUCTO: Plataforma de mentoría conversacional con IA para jóvenes 18-35.",
    "STACK: Next.js 16, Prisma + PostgreSQL, Resend (email), Stripe (pagos), Telegram bot, Coolify (deploy).",
    "DOMINIO: https://tresmilmillonesdelatidos.es",
    "",
    "MÉTRICAS ACTUALES:",
    `- Usuarios totales: ${totalUsers} (activos hoy: ${activeToday}, 7d: ${active7d})`,
    `- Mensajes hoy: ${messagesTotal} (7d: ${messages7d})`,
    `- Rachas activas: ${activeStreaks}`,
    `- Objetivos activos: ${goalsActive}`,
    `- Usuarios Pro: ${proUsers}`,
    `- Crisis 7d: ${crisisEvents}`,
    `- Waitlist aprobados: ${waitlist}`,
    "",
    "ARQUITECTURA CLAVE:",
    "- Repo: github.com/mariopablobarron/TresMilMillonesAI",
    "- Chat pipeline: src/application/chat/processMessage.ts → analyze → enrich → buildCoachPrompt → generateAIResponse → persist",
    "- Mentor modes: src/services/mentor-protocol.ts — 4 modos (containment/supportive/directive/confrontation)",
    "- Identity & philosophy: src/lib/mentor-identity.ts",
    "- Coach prompt builder: src/services/coach.ts (buildCoachPrompt, 450+ lines)",
    "- Flows: src/services/flows.ts — decision flow (5 pasos) + avoidance flow",
    "- Intent detection: src/services/intent.ts",
    "- Emotional model: src/services/emotional-model.ts",
    "- Transformation phases: src/services/transformation.ts (bloqueo→exploración→decisión→acción→consistencia)",
    "- Admin: RBAC 7 roles en src/lib/permissions.ts",
    "- Auth: HMAC-SHA256 JWT en src/lib/auth.ts",
    "- Crons: 8+1 endpoints en src/app/api/cron/ con alertas automáticas",
    "- Email: 11 plantillas Resend en src/lib/email.ts",
    "- Billing: Stripe en src/services/billing.ts — Free / Pro (9€/mes)",
    "- User profile: src/app/api/user/profile/route.ts (nombre, bio, avatar, teléfono)",
    "- Settings: src/app/settings/page.tsx",
    "- Google OAuth: src/app/api/auth/google/ (pendiente de API key en Coolify)",
    "",
    "FILOSOFÍA DEL MENTOR (marco pedagógico — NO NEGOCIABLE):",
    "- Interpelar antes de instruir: preguntar para que la persona descubra, no decir qué hacer",
    "- Siempre explicar el porqué: sin porqué, la acción es obediencia, no cambio",
    "- Gafas nuevas: ayudar a ver lo que han normalizado (¿por qué tiene que ser así?)",
    "- De lo local a lo global: empezar por lo concreto de hoy, descubrir el patrón grande",
    "- El cambio viene de dentro: no se impone, se interpela",
    "- Estructura de respuesta del mentor: Reflejo → Porqué → Pregunta que abre → Acción posible",
    "",
    "REGLAS DE RESPUESTA:",
    "- Responde en español.",
    "- Razona como un CTO senior que conoce cada línea del código.",
    "- Si te preguntan sobre código, da paths de archivos concretos y números de línea cuando sea relevante.",
    "- Si te piden cambios, describe exactamente qué archivos tocar, qué funciones modificar y por qué.",
    "- Si es una decisión estratégica, analiza pros y contras antes de recomendar.",
    "- No pongas límite de palabras. Sé tan extenso como necesite el razonamiento.",
    "- Si no sabes algo con certeza, dilo.",
  ].join("\n");

  try {
    // Use Anthropic API directly for Opus + adaptive thinking
    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logError("TELEGRAM", new Error(`Anthropic API HTTP ${res.status}`), { body: body.slice(0, 300) });
        // Fall through to OpenRouter
      } else {
        const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
        const textBlock = data.content?.find((b) => b.type === "text");
        if (textBlock?.text) return textBlock.text.trim();
      }
    }

    // Fallback to OpenRouter
    if (openrouterKey) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-6",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logError("TELEGRAM", new Error(`OpenRouter HTTP ${res.status}`), { body: body.slice(0, 200) });
        return `❌ Error de IA (${res.status}). Intenta de nuevo.`;
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content?.trim() ?? "Sin respuesta.";
    }

    return "❌ No hay API key disponible.";
  } catch (err: unknown) {
    logError("TELEGRAM", err, { area: "callAdminAI" });
    return "❌ Timeout o error llamando a la IA.";
  }
}

async function buildEstadoAdminMessage(): Promise<string> {
  const prisma = getPrismaClient();

  const rows = await prisma.userState.groupBy({
    by: ["state"],
    _count: { state: true },
    orderBy: { _count: { state: "desc" } },
  });

  if (rows.length === 0) return "Sin datos de estado emocional.";

  const total = rows.reduce((sum, r) => sum + r._count.state, 0);
  const lines = rows.map((r) => {
    const pct = ((r._count.state / total) * 100).toFixed(0);
    return `  ${r.state}: ${r._count.state} (${pct}%)`;
  });

  return `🧠 *Distribución emocional actual*\n\nTotal: ${total} usuarios\n\n${lines.join("\n")}`;
}

// ---- Helpers ----

function hasSafetyKeyword(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return SAFETY_KEYWORDS.some((kw) => normalized.includes(kw));
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logError("TELEGRAM", new Error("TELEGRAM_BOT_TOKEN not set"), { chatId });
    return;
  }
  try {
    const res = await fetchWithTimeout(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logError("TELEGRAM", new Error(`sendMessage HTTP ${res.status}: ${body.slice(0, 200)}`), {
        chatId,
      });
    }
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "sendTelegramMessage", chatId });
  }
}

// ---- Webhook handler ----

export async function POST(req: NextRequest) {
  // Global rate limit: 100 req/min — protects against webhook abuse
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "telegram";
  const rl = checkRateLimit(`webhook:global:${ip}`, 100, 60_000);
  if (!rl.allowed) {
    // Return 200 to Telegram so it doesn't retry aggressively
    return NextResponse.json({ ok: true });
  }

  // Verify Telegram webhook secret
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    logWarn("TELEGRAM", "webhook_secret_not_configured", {
      warning: "TELEGRAM_WEBHOOK_SECRET not set — webhook accepts all requests",
    });
  }

  let chatId: number | undefined;

  try {
    const update = (await req.json()) as TelegramUpdate;

    // ---- callback_query (botones inline) ----
    if (update.callback_query) {
      const cb = update.callback_query;
      if (cb.message && cb.data) {
        await handleCallbackQuery({
          callbackId: cb.id,
          chatId: cb.message.chat.id,
          messageId: cb.message.message_id,
          fromId: cb.from.id,
          data: cb.data,
          isAdmin: isAdminFrom(cb.from.id),
        });
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;

    // Ignore non-text updates silently
    if (!message?.text?.trim()) {
      return NextResponse.json({ ok: true });
    }

    chatId = message.chat.id;
    const text = message.text.trim();
    const userId = `tg_${chatId}`;

    logInfo("TELEGRAM", "message_received", { chatId, userId, textLength: text.length });

    // ---- Handle /borrar_datos ----
    if (text === "/borrar_datos") {
      try {
        await deleteTelegramUserData(chatId);
        await sendTelegramMessage(chatId, DELETE_CONFIRM_MESSAGE);
      } catch {
        await sendTelegramMessage(chatId, DELETE_ERROR_MESSAGE);
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Handle /privacidad ----
    if (text === "/privacidad") {
      await sendTelegramMessage(chatId, PRIVACY_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // ---- Look up user ----
    let user = await findTelegramUser(chatId);

    // ---- Handle /start (with optional deep link param) ----
    if (text === "/start" || text.startsWith("/start ")) {
      const startParam = text.split(" ")[1]?.trim();

      // Deep link from web signup: /start link_TOKEN
      if (startParam?.startsWith("link_")) {
        const rawToken = startParam.slice(5); // remove "link_" prefix
        try {
          const payload = verifyWebLinkToken(rawToken);
          const prisma = getPrismaClient();
          // Link Telegram chatId to the web user
          await prisma.user.update({
            where: { id: payload.userId },
            data: { telegramId: String(chatId), consentGiven: true, consentAt: new Date() },
          });
          await sendTelegramMessage(chatId, "✅ ¡Cuenta vinculada! Ahora recibirás todo por aquí.");
          sendWelcomeSequence(payload.userId, String(chatId));
          logInfo("TELEGRAM", "web_link_success", { chatId, webUserId: payload.userId });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("EXPIRED")) {
            await sendTelegramMessage(chatId, "⏰ Este enlace ha caducado. Genera uno nuevo desde la app.");
          } else {
            await sendTelegramMessage(chatId, "❌ Enlace no válido. Inténtalo de nuevo desde la web.");
          }
          logError("TELEGRAM", err, { area: "web_link", chatId });
        }
        return NextResponse.json({ ok: true });
      }

      // Normal /start
      if (!user || !user.consentGiven) {
        await sendTelegramMessage(chatId, CONSENT_MESSAGE);
      } else {
        await sendTelegramMessage(chatId, "Ya tienes una sesión activa. ¿En qué te puedo ayudar?");
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Consent gate ----
    if (!user || !user.consentGiven) {
      if (text.toUpperCase() === "ACEPTO") {
        user = await createTelegramUserWithConsent(chatId);
        await sendTelegramMessage(chatId, WELCOME_MESSAGE);
        return NextResponse.json({ ok: true });
      }
      await sendTelegramMessage(chatId, CONSENT_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // ---- Handle /salir (requires consent check above) ----
    if (text === "/salir") {
      try {
        await deactivateTelegramUser(userId);
      } catch (err: unknown) {
        logError("TELEGRAM", err, { area: "/salir", userId });
      }
      await sendTelegramMessage(chatId, SALIR_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // ---- Handle /vincular ----
    if (text === "/vincular") {
      const token = issueTelegramLinkToken(userId);
      await sendTelegramMessage(chatId, buildTelegramLinkMessage(token));
      return NextResponse.json({ ok: true });
    }

    // ---- Admin notes (bandeja de notas rápidas; solo admin) ----
    // Acepta: "/nota <texto>", "/notas", "/nota_hecha <id>", o mensaje que empiece por 📝
    // Reutiliza el modelo AdminNote (tablón admin). Tag del mensaje (#cron, #env…) se
    // valida contra el set oficial; si no coincide, cae a "general".
    const VALID_NOTE_TAGS = new Set(["general", "referrals", "migration", "env", "cron", "ui", "incident"]);
    const isNoteCommand =
      isAdmin(chatId) &&
      (text === "/notas" ||
        text.startsWith("/nota ") ||
        text.startsWith("/nota_hecha ") ||
        text.startsWith("📝"));
    if (isNoteCommand) {
      try {
        const prisma = getPrismaClient();
        if (text === "/notas") {
          const notes = await prisma.adminNote.findMany({
            where: { status: "open" },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          if (notes.length === 0) {
            await sendTelegramMessage(chatId, "📭 No hay notas pendientes.");
          } else {
            const body = notes
              .map((n) => {
                const when = new Date(n.createdAt).toLocaleString("es-ES", {
                  timeZone: "Europe/Madrid",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const preview = n.title.length > 140 ? `${n.title.slice(0, 137)}...` : n.title;
                return `• \`${n.id.slice(-6)}\` ${when} · #${n.tag} — ${preview}`;
              })
              .join("\n");
            await sendTelegramMessage(
              chatId,
              `📒 *Notas pendientes (${notes.length})*\n\n${body}\n\n_Marca como hecha con /nota_hecha <id6>_`
            );
          }
        } else if (text.startsWith("/nota_hecha ")) {
          const suffix = text.slice("/nota_hecha ".length).trim();
          const match = await prisma.adminNote.findFirst({
            where: { id: { endsWith: suffix }, status: "open" },
            orderBy: { createdAt: "desc" },
          });
          if (!match) {
            await sendTelegramMessage(chatId, `No encuentro una nota pendiente con id terminado en "${suffix}".`);
          } else {
            await prisma.adminNote.update({
              where: { id: match.id },
              data: { status: "done", resolvedAt: new Date(), resolvedBy: "telegram_admin" },
            });
            await sendTelegramMessage(chatId, `✅ Nota \`${match.id.slice(-6)}\` marcada como hecha.`);
          }
        } else {
          // /nota <texto> ó 📝 <texto>
          const raw = text.startsWith("/nota ")
            ? text.slice("/nota ".length).trim()
            : text.replace(/^📝\s*/u, "").trim();
          if (!raw) {
            await sendTelegramMessage(chatId, "Escribe el contenido después de /nota o del 📝.");
          } else {
            const tagMatch = raw.match(/#(\w[\w-]*)/);
            const tag = tagMatch && VALID_NOTE_TAGS.has(tagMatch[1]) ? tagMatch[1] : "general";
            // Primer párrafo (o primeros 200 chars) como título; resto al body.
            const firstLineBreak = raw.indexOf("\n");
            let title = firstLineBreak === -1 ? raw : raw.slice(0, firstLineBreak).trim();
            let body: string | null =
              firstLineBreak === -1 ? null : raw.slice(firstLineBreak + 1).trim() || null;
            if (title.length > 200) {
              const overflow = title.slice(200);
              title = title.slice(0, 200);
              body = body ? `${overflow}\n\n${body}` : overflow;
            }
            const created = await prisma.adminNote.create({
              data: { title, body, tag, priority: "medium", createdBy: "telegram_admin" },
            });
            await sendTelegramMessage(
              chatId,
              `📝 Nota guardada \`${created.id.slice(-6)}\` · #${tag}`
            );
          }
        }
      } catch (err: unknown) {
        logError("TELEGRAM", err, { area: "admin_notes", command: text });
        await sendTelegramMessage(chatId, "Error al guardar/leer la nota.");
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Admin commands (only respond to ADMIN_TELEGRAM_ID) ----
    // ---- /redeploy (admin) — confirmación con botones inline ----
    if (text === "/redeploy") {
      if (!isAdmin(chatId)) {
        await sendTelegramMessage(chatId, "⛔ Comando no disponible.");
        return NextResponse.json({ ok: true });
      }
      await sendTelegramWithButtons(
        chatId,
        "🚀 *Confirmar Force Redeploy de luciernaga-ai*\n\nEsto disparará un build inmediato en Coolify.",
        [
          [
            { text: "✅ Sí, redeploy", callback_data: "redeploy:confirm" },
            { text: "❌ Cancelar", callback_data: "redeploy:cancel" },
          ],
        ]
      );
      return NextResponse.json({ ok: true });
    }

    const adminCommands = ["/stats", "/usuarios", "/crisis", "/retencion", "/tareas", "/ayuda", "/cartas", "/deploy", "/llm", "/ingresos", "/salud"];
    if (
      adminCommands.includes(text) ||
      text.startsWith("/hecho") ||
      text === "/buscar" ||
      text.startsWith("/buscar ")
    ) {
      if (!isAdmin(chatId)) {
        await sendTelegramMessage(chatId, "⛔ Comando no disponible.");
        return NextResponse.json({ ok: true });
      }
      try {
        let reply: string;
        if (text === "/stats") {
          reply = await buildStatsMessage();
        } else if (text === "/usuarios") {
          reply = await buildUsuariosMessage();
        } else if (text === "/crisis") {
          reply = await buildCrisisMessage();
        } else if (text === "/retencion") {
          reply = await buildRetentionMessage();
        } else if (text === "/tareas") {
          reply = await buildTasksMessage();
        } else if (text === "/cartas") {
          reply = await buildWeeklyLetterSummaryMessage();
        } else if (text === "/deploy") {
          reply = await buildDeployMessage();
        } else if (text === "/llm") {
          reply = await buildLlmCostMessage();
        } else if (text === "/ingresos") {
          reply = await buildRevenueMessage();
        } else if (text === "/salud") {
          reply = await buildHealthMessage();
        } else if (text === "/buscar" || text.startsWith("/buscar ")) {
          const q = text === "/buscar" ? "" : text.slice("/buscar ".length).trim();
          reply = await buildUserSearchMessage(q);
        } else if (text === "/ayuda") {
          reply = [
            "🛠 *Comandos admin*",
            "/stats — resumen del día",
            "/usuarios — activos últimas 24h",
            "/crisis — usuarios en crisis activa",
            "/retencion — métricas de retención",
            "/estado — distribución emocional",
            "/tareas — tareas pendientes antiguas",
            "/cartas — resumen weekly-letter (último cron + acumulado)",
            "",
            "🔧 *Operaciones*",
            "/deploy — HEAD de main (commit, autor, fecha)",
            "/redeploy — Force Redeploy en Coolify (con confirmación)",
            "/salud — checks rápidos: DB, crons, errores, negocio (24h)",
            "/llm — gasto LLM hoy / 7d / 30d + top modelos",
            "",
            "💼 *Negocio*",
            "/ingresos — MRR, suscripciones activas, churn",
            "/buscar <email_o_id> — busca un usuario y resume su estado",
            "",
            "📒 *Bandeja de notas*",
            "/nota <texto> — guarda una nota (o empieza con 📝)",
            "/notas — lista pendientes (últimas 10)",
            "/nota_hecha <id6> — marca como trabajada",
            "",
            "💬 *Mensaje libre* → co-piloto IA con contexto completo del producto, métricas, código y arquitectura.",
            "",
            "Ejemplos:",
            "• ¿Cuántos usuarios activos hay esta semana?",
            "• ¿Cómo funciona el flujo de decisión del mentor?",
            "• Quiero añadir notificaciones push, ¿qué archivos toco?",
            "• ¿Qué métricas debería mejorar ahora?",
          ].join("\n");
        } else {
          reply = "Comando no reconocido.";
        }
        await sendTelegramMessage(chatId, reply);
      } catch (err: unknown) {
        logError("TELEGRAM", err, { area: "admin_command", command: text });
        await sendTelegramMessage(chatId, "Error al obtener datos.");
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Admin free-form message → deep AI reasoning ----
    if (isAdmin(chatId)) {
      await sendTelegramMessage(chatId, "🧠 Razonando en profundidad...");
      const adminChatId = chatId;
      const adminText = text;
      after(async () => {
        const reply = await callAdminAI(adminText);
        await sendLongTelegramMessage(adminChatId, reply);
      });
      return NextResponse.json({ ok: true });
    }

    // /estado: admin sees distribution, regular users see their pending actions
    if (text === "/estado") {
      if (isAdmin(chatId)) {
        try {
          const reply = await buildEstadoAdminMessage();
          await sendTelegramMessage(chatId, reply);
        } catch (err: unknown) {
          logError("TELEGRAM", err, { area: "admin_estado", userId });
          await sendTelegramMessage(chatId, "Error al obtener distribución.");
        }
        return NextResponse.json({ ok: true });
      }
      // ---- user /estado (existing logic below) ----
      try {
        const pending = await getPendingActions(userId);
        if (pending.length === 0) {
          await sendTelegramMessage(chatId, "No tienes acciones pendientes en este momento.");
        } else {
          const lines = pending.flatMap((p) => [
            `🎯 ${p.goalTitle}`,
            ...p.actions.map((a) => `  • ${a}`),
          ]);
          await sendTelegramMessage(chatId, `Tus acciones pendientes:\n\n${lines.join("\n")}`);
        }
      } catch (err: unknown) {
        logError("TELEGRAM", err, { area: "/estado", userId });
        await sendTelegramMessage(chatId, "No pude cargar tu estado en este momento.");
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Safety gate ----
    if (hasSafetyKeyword(text)) {
      logError("TELEGRAM", new Error("safety_trigger"), { area: "safety_gate", userId });
      await sendTelegramMessage(chatId, SAFETY_RESPONSE);
      await sendAdminUserAlert({
        userId,
        lastMessage: text,
        state: "riesgo",
        reason: "Palabras clave de riesgo vital detectadas",
      }).catch(() => undefined);
      // Persist crisis event
      try {
        const conversationId = await getOrCreateTelegramConversation(userId);
        await saveConversationMessage({
          conversationId,
          userId,
          role: "user",
          content: text,
          updateTitleFromUserMessage: false,
        });
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: SAFETY_RESPONSE,
        });
      } catch {
        // Non-critical
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Authenticated chat flow ----
    await touchTelegramUser(userId);

    const state = detectUserState(text);
    const existingProfile = await getEmotionalProfile(userId).catch(
      () => DEFAULT_EMOTIONAL_PROFILE
    );
    const emotionalProfile = analyzeEmotionalProfile(text, []) ?? existingProfile;

    const aiResult = await generateAIResponse(text, state, emotionalProfile, {
      access: {
        userPlan: "free",
        remainingMessages: null,
        hasActiveGoal: false,
        conversionTrigger: false,
      },
    });

    logInfo("TELEGRAM", "response_generated", { chatId, userId, fallback: aiResult.fallback });

    // ---- Persist both messages ----
    try {
      const conversationId = await getOrCreateTelegramConversation(userId);
      await saveConversationMessage({
        conversationId,
        userId,
        role: "user",
        content: text,
        updateTitleFromUserMessage: false,
      });
      await saveConversationMessage({
        conversationId,
        userId,
        role: "assistant",
        content: aiResult.response,
      });
    } catch (dbError: unknown) {
      logError("TELEGRAM", dbError, { area: "message_persistence", userId });
    }

    // ---- Crisis detection + admin alert ----
    if (isCrisisState(state)) {
      await logTelegramCrisis(userId, text, aiResult.response);
      await sendAdminUserAlert({
        userId,
        lastMessage: text,
        state,
        reason: `Estado emocional: ${state}`,
      }).catch(() => undefined);
    }

    // ---- Forward conversation to admin (if enabled) ----
    const { getNotificationConfig } = await import("@/lib/notification-config");
    const notifConfig = await getNotificationConfig();
    const adminChatId = process.env.ADMIN_TELEGRAM_ID?.trim();
    if (adminChatId && chatId.toString() !== adminChatId && notifConfig.telegramUserMessages) {
      const userName = message.from?.first_name ?? userId;
      const preview = text.length > 200 ? text.slice(0, 200) + "…" : text;
      const aiPreview = aiResult.response.length > 300 ? aiResult.response.slice(0, 300) + "…" : aiResult.response;
      const fwd = [
        `💬 *${userName}* (${userId})`,
        `👤 ${preview}`,
        `🤖 ${aiPreview}`,
      ].join("\n\n");
      sendTelegramMessage(Number(adminChatId), fwd).catch(() => {});
    }

    // ---- Send reply ----
    await sendTelegramMessage(chatId, aiResult.response);
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "webhook_handler", chatId });
    // Always return 200 so Telegram doesn't retry
  }

  return NextResponse.json({ ok: true });
}
