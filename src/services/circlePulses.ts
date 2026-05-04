import { getPrismaClient } from "@/db/prisma";
import { logInfo, logError } from "@/lib/logger";
import { buildCirclePulseOpenedEmail, buildMentorReflectionEmail, sendUserEmail } from "@/lib/email";
import { BACKGROUND_FAST_MODEL as OPENROUTER_MODEL } from "@/lib/openrouter-models";

const APP_URL = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";

// ─── Tunables ────────────────────────────────────────────────────────────────

const PULSE_LENGTH_DAYS = 7;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

// ─── Time helpers ────────────────────────────────────────────────────────────

/**
 * Returns the Monday 00:00 UTC of the week containing `now`. Used as the canonical
 * weekStart key so two calls in the same week produce the same Pulse identity.
 */
export function weekStartOf(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export function weekEndOf(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + PULSE_LENGTH_DAYS);
  d.setUTCMilliseconds(d.getUTCMilliseconds() - 1);
  return d;
}

// ─── Emergent prompt generation ──────────────────────────────────────────────

const PROMPT_SYSTEM = `Eres el orquestador del círculo en Tres Mil Millones de Latidos. Tu tarea: redactar una sola pregunta semanal para un grupo cerrado de 4 personas que comparten un mismo patrón emocional reciente.

Reglas absolutas:
1. Una sola pregunta. Sin introducción. Sin firma. Máximo 25 palabras.
2. La pregunta debe nombrar el patrón compartido sin diagnosticar — usa el lenguaje del grupo, no etiquetas clínicas.
3. Ni rescate, ni motivación de cartel. La pregunta debe abrir, no cerrar.
4. Segunda persona singular ("tú"), no plural — cada miembro responde solo.
5. Si recibes contexto contradictorio o vacío, responde: PROMPT_FALLBACK.`;

function buildPromptUserMessage(matchPattern: string, matchEmotion: string, weekStart: Date): string {
  return [
    `Patrón compartido del grupo: ${matchPattern}`,
    `Emoción dominante: ${matchEmotion}`,
    `Semana que empieza: ${weekStart.toISOString().slice(0, 10)}`,
    ``,
    `Escribe la pregunta del pulso semanal.`,
  ].join("\n");
}

function fallbackPrompt(matchPattern: string, matchEmotion: string): string {
  return `¿Qué reconoces hoy en ti del patrón "${matchPattern}" con la emoción "${matchEmotion}", que la semana pasada no veías?`;
}

async function callOpenRouter(systemPrompt: string, userPrompt: string, maxTokens = 200): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("OpenRouter empty reply");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateEmergentPrompt(
  circleId: string,
  weekStart: Date,
  options: { callLLM?: (system: string, user: string) => Promise<string> } = {},
): Promise<{ prompt: string; promptSource: "emergent" | "fallback" }> {
  const prisma = getPrismaClient();
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { matchPattern: true, matchEmotion: true },
  });
  if (!circle) throw new Error(`Circle ${circleId} not found`);

  const callLLM = options.callLLM ?? ((s, u) => callOpenRouter(s, u, 80));
  try {
    const raw = await callLLM(PROMPT_SYSTEM, buildPromptUserMessage(circle.matchPattern, circle.matchEmotion, weekStart));
    if (raw === "PROMPT_FALLBACK" || raw.length < 10 || raw.length > 220) {
      return { prompt: fallbackPrompt(circle.matchPattern, circle.matchEmotion), promptSource: "fallback" };
    }
    return { prompt: raw, promptSource: "emergent" };
  } catch (error) {
    logError("CIRCLE_PULSES", error, { circleId, step: "generate_prompt" });
    return { prompt: fallbackPrompt(circle.matchPattern, circle.matchEmotion), promptSource: "fallback" };
  }
}

// ─── Pulse open / close ──────────────────────────────────────────────────────

/**
 * Opens this week's Pulse for a circle if it doesn't exist yet. Idempotent on
 * (circleId, weekStart). Returns the pulse id.
 */
export async function openWeeklyPulseForCircle(
  circleId: string,
  now: Date = new Date(),
): Promise<{ pulseId: string; created: boolean }> {
  const prisma = getPrismaClient();
  const weekStart = weekStartOf(now);
  const weekEnd = weekEndOf(weekStart);

  const existing = await prisma.circlePulse.findUnique({
    where: { circleId_weekStart: { circleId, weekStart } },
    select: { id: true },
  });
  if (existing) return { pulseId: existing.id, created: false };

  const { prompt, promptSource } = await generateEmergentPrompt(circleId, weekStart);

  const created = await prisma.circlePulse.create({
    data: {
      circleId,
      prompt,
      promptSource,
      weekStart,
      weekEnd,
      status: "open",
      openedAt: now,
    },
    select: { id: true },
  });
  logInfo("CIRCLE_PULSES", "pulse_opened", { circleId, pulseId: created.id, promptSource });

  // Notify members the pulse is open. Failures are non-blocking — the pulse exists
  // either way and the user will see it next time they open the app.
  try {
    const members = await prisma.circleMember.findMany({
      where: { circleId, leftAt: null },
      select: { user: { select: { id: true, email: true, name: true } } },
    });
    await Promise.all(
      members
        .filter((m) => Boolean(m.user.email))
        .map((m) =>
          sendUserEmail({
            to: m.user.email,
            userId: m.user.id,
            template: "circle_pulse_opened",
            ...buildCirclePulseOpenedEmail({
              name: m.user.name,
              prompt,
              weekEnd,
              appUrl: APP_URL,
            }),
          }),
        ),
    );
  } catch (error) {
    logError("CIRCLE_PULSES", error, { step: "notify_pulse_opened", circleId, pulseId: created.id });
  }

  return { pulseId: created.id, created: true };
}

/**
 * Opens this week's pulse for every active circle.
 */
export async function runOpenAllPulses(now: Date = new Date()): Promise<{ opened: number; skipped: number }> {
  const prisma = getPrismaClient();
  const circles = await prisma.circle.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  let opened = 0;
  let skipped = 0;
  for (const c of circles) {
    try {
      const r = await openWeeklyPulseForCircle(c.id, now);
      if (r.created) opened += 1;
      else skipped += 1;
    } catch (error) {
      logError("CIRCLE_PULSES", error, { step: "open_all", circleId: c.id });
    }
  }
  return { opened, skipped };
}

/**
 * Closes any pulse whose weekEnd has passed and is still open. Triggers reflection
 * generation for each member that responded.
 */
export async function runCloseExpiredPulses(now: Date = new Date()): Promise<{ closed: number; reflectionsCreated: number }> {
  const prisma = getPrismaClient();
  const expired = await prisma.circlePulse.findMany({
    where: { status: "open", weekEnd: { lte: now } },
    select: { id: true, circleId: true },
  });

  let reflectionsCreated = 0;
  for (const pulse of expired) {
    try {
      await prisma.circlePulse.update({
        where: { id: pulse.id },
        data: { status: "closed", closedAt: now },
      });
      const created = await generateReflectionsForPulse(pulse.id);
      reflectionsCreated += created;
    } catch (error) {
      logError("CIRCLE_PULSES", error, { step: "close_pulse", pulseId: pulse.id });
    }
  }
  return { closed: expired.length, reflectionsCreated };
}

// ─── Mentor reflections ──────────────────────────────────────────────────────

const REFLECTION_SYSTEM = `Eres el mentor de Tres Mil Millones de Latidos. Te llegan las respuestas anónimas que cuatro personas de un mismo círculo dieron a la pregunta semanal. Tu tarea: escribir, para una sola persona del grupo, una devolución privada que refleje qué del grupo le toca a ELLA en concreto.

Reglas absolutas:
1. Máximo 90 palabras. Tono directo, respetuoso, sin adornos.
2. Cita textualmente al menos una frase de OTRO miembro del grupo (entre comillas españolas) — no la propia respuesta del destinatario.
3. No recetas, no consejos, no "deberías". Solo reflejo + una pregunta corta al final.
4. Nada de emojis, "abrazos" ni metáforas cursis.
5. Si no hay material suficiente, responde: NO_MATERIAL.`;

function buildReflectionUserMessage(
  pulsePrompt: string,
  ownResponse: string,
  othersResponses: string[],
): string {
  const others = othersResponses.map((r, i) => `[${i + 1}] "${r.replace(/"/g, "'")}"`).join("\n");
  return [
    `Pregunta del pulso: ${pulsePrompt}`,
    ``,
    `Tu respuesta (la de la persona destinataria):`,
    `"${ownResponse.replace(/"/g, "'")}"`,
    ``,
    `Respuestas anónimas del resto del círculo:`,
    others,
    ``,
    `Escribe la devolución privada para esta persona.`,
  ].join("\n");
}

/**
 * Generates a MentorReflection for each member that responded to the pulse.
 * The reflection is left in `source: "auto"` until an admin approves it; only
 * approved reflections are visible to the user.
 */
export async function generateReflectionsForPulse(
  pulseId: string,
  options: { callLLM?: (system: string, user: string) => Promise<string> } = {},
): Promise<number> {
  const prisma = getPrismaClient();
  const pulse = await prisma.circlePulse.findUnique({
    where: { id: pulseId },
    select: {
      id: true,
      prompt: true,
      responses: { select: { userId: true, content: true } },
    },
  });
  if (!pulse) return 0;
  if (pulse.responses.length < 2) {
    // Not enough peer voices to reflect back. Skip silently.
    return 0;
  }

  const callLLM = options.callLLM ?? ((s, u) => callOpenRouter(s, u, 250));

  let created = 0;
  for (const own of pulse.responses) {
    const others = pulse.responses
      .filter((r) => r.userId !== own.userId)
      .map((r) => r.content);

    let content: string;
    let source: "auto" | "fallback" = "auto";
    try {
      const raw = await callLLM(REFLECTION_SYSTEM, buildReflectionUserMessage(pulse.prompt, own.content, others));
      if (raw === "NO_MATERIAL" || raw.length < 30) {
        source = "fallback";
        content = "Lo que escribiste deja huella aunque hoy no lleguen palabras del mentor.";
      } else {
        content = raw;
      }
    } catch (error) {
      logError("CIRCLE_PULSES", error, { pulseId, userId: own.userId, step: "reflection" });
      source = "fallback";
      content = "Lo que escribiste deja huella aunque hoy no lleguen palabras del mentor.";
    }

    try {
      await prisma.mentorReflection.create({
        data: {
          pulseId: pulse.id,
          userId: own.userId,
          content,
          source,
        },
      });
      created += 1;
    } catch (error) {
      // Unique constraint — already exists. Skip silently.
      logInfo("CIRCLE_PULSES", "reflection_skip_existing", { pulseId, userId: own.userId });
    }
  }

  return created;
}
