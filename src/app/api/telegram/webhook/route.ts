import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
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
import { issueTelegramLinkToken } from "@/lib/telegram-link";
import { sendAdminUserAlert } from "@/lib/alerts";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";
import { getPrismaClient } from "@/db/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

// ---- Telegram types ----

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
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

Por favor contacta ahora con una línea de crisis:
🆘 España: 024 (línea de atención a la conducta suicida)
🆘 México: 800 290 0024 (SAPTEL)
🆘 Argentina: (011) 5275-1135 (Centro de Asistencia al Suicida)

Si estás en peligro inmediato, llama al número de emergencias de tu país (112 / 911).

Estoy aquí, pero esto necesita atención humana ahora.`;

const CONSENT_MESSAGE = `Antes de empezar necesito tu consentimiento.

Este asistente utiliza inteligencia artificial para acompañarte en decisiones personales.

🔹 Tus datos serán tratados de forma confidencial
🔹 Puedes dejar de usarlo en cualquier momento
🔹 No sustituye ayuda profesional

Consulta la política: ${process.env.APP_BASE_URL ?? "https://luciernaga.ai"}/privacidad

Escribe ACEPTO para continuar.`;

const PRIVACY_MESSAGE = `📋 *Política de privacidad*

Tus mensajes se almacenan de forma segura para mantener la continuidad de la conversación.

🔹 No compartimos tu información con terceros
🔹 Puedes eliminar todos tus datos en cualquier momento
🔹 Para borrar tus datos escribe: /borrar_datos
🔹 Para desactivar recordatorios escribe: /salir

Más información: ${process.env.APP_BASE_URL ?? "https://luciernaga.ai"}/privacidad`;

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

async function callAdminAI(question: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return "❌ OPENROUTER_API_KEY no configurada.";

  const prisma = getPrismaClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalUsers, activeToday, messagesTotal, activeStreaks, waitlist] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeen: { gte: startOfDay } } }),
    prisma.message.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.streak.count({ where: { status: "active" } }),
    prisma.waitlistEntry.count({ where: { status: "approved" } }),
  ]);

  const systemPrompt = [
    "Eres el asistente de administración de Tres Mil Millones de Latidos, una plataforma de coaching emocional e inteligencia artificial.",
    "",
    "Contexto actual del sistema:",
    `- Usuarios totales: ${totalUsers}`,
    `- Activos hoy: ${activeToday}`,
    `- Mensajes hoy: ${messagesTotal}`,
    `- Rachas activas: ${activeStreaks}`,
    `- Waitlist aprobados: ${waitlist}`,
    "",
    "Puedes responder preguntas sobre métricas, estrategia, código, features, bugs, o cualquier cosa relacionada con el producto.",
    "Sé directo, conciso y práctico. Responde en español. Usa emojis con moderación.",
    "Máximo 400 palabras.",
  ].join("\n");

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "https://luciernaga.ai",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 600,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logError("TELEGRAM", new Error(`Admin AI HTTP ${res.status}`), { body: body.slice(0, 200) });
      return `❌ Error de IA (${res.status}). Intenta de nuevo.`;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? "Sin respuesta.";
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Global rate limit: 100 req/min — protects against webhook abuse
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "telegram";
  const rl = checkRateLimit(`webhook:global:${ip}`, 100, 60_000);
  if (!rl.allowed) {
    // Return 200 to Telegram so it doesn't retry aggressively
    return NextResponse.json({ ok: true });
  }

  // Verify Telegram webhook secret if configured
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let chatId: number | undefined;

  try {
    const update = (await req.json()) as TelegramUpdate;
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

    // ---- Handle /start ----
    if (text === "/start") {
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

    // ---- Admin commands (only respond to ADMIN_TELEGRAM_ID) ----
    const adminCommands = ["/stats", "/usuarios", "/crisis", "/retencion", "/tareas", "/ayuda"];
    if (adminCommands.includes(text) || text.startsWith("/hecho")) {
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
        } else if (text === "/ayuda") {
          reply = [
            "🛠 *Comandos admin*",
            "/stats — resumen del día",
            "/usuarios — activos últimas 24h",
            "/crisis — usuarios en crisis activa",
            "/retencion — métricas de retención",
            "/estado — distribución emocional",
            "/tareas — tareas pendientes antiguas",
            "",
            "💬 Cualquier mensaje libre → respuesta IA directa en segundos.",
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

    // ---- Admin free-form message → direct AI response ----
    if (isAdmin(chatId)) {
      await sendTelegramMessage(chatId, "⏳ Pensando...");
      const adminChatId = chatId;
      const adminText = text;
      after(async () => {
        const reply = await callAdminAI(adminText);
        await sendTelegramMessage(adminChatId, reply);
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

    // ---- Send reply ----
    await sendTelegramMessage(chatId, aiResult.response);
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "webhook_handler", chatId });
    // Always return 200 so Telegram doesn't retry
  }

  return NextResponse.json({ ok: true });
}
