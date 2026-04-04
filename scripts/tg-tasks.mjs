#!/usr/bin/env node
/**
 * tg-tasks.mjs
 *
 * Fetches pending admin tasks queued via Telegram, executes each one
 * through Claude Code, and sends the result back to the admin via Telegram.
 *
 * Usage: npm run tg-tasks
 */

import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Load env
const dotenv = (() => {
  try { return require("dotenv"); } catch { return null; }
})();
dotenv?.config({ path: new URL("../.env", import.meta.url).pathname });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID  = process.env.ADMIN_TELEGRAM_ID;
const DB_URL    = process.env.DATABASE_URL;

if (!BOT_TOKEN || !ADMIN_ID || !DB_URL) {
  console.error("❌ Faltan variables de entorno: TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_ID, DATABASE_URL");
  process.exit(1);
}

// ── Telegram helper ───────────────────────────────────────────────────────────

async function tgSend(text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode: "Markdown" }),
  });
}

// ── Prisma (loaded dynamically so env is set first) ───────────────────────────

async function getPrisma() {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({ datasources: { db: { url: DB_URL } } });
}

// ── Execute a task via Claude Code ────────────────────────────────────────────

function runClaude(instruction) {
  try {
    // -p = print mode (non-interactive), output goes to stdout
    const output = execSync(
      `npx --yes @anthropic-ai/claude-code -p ${JSON.stringify(instruction)}`,
      {
        cwd: new URL("..", import.meta.url).pathname,
        timeout: 5 * 60 * 1000, // 5 min max per task
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    return { ok: true, output: output.trim() };
  } catch (err) {
    const msg = err.stdout?.trim() || err.stderr?.trim() || err.message;
    return { ok: false, output: msg };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = await getPrisma();

  const tasks = await prisma.adminTask.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 5, // process up to 5 per run
  });

  if (tasks.length === 0) {
    console.log("✅ Sin tareas pendientes.");
    await tgSend("✅ Sin tareas pendientes.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 ${tasks.length} tarea(s) pendiente(s). Ejecutando...`);
  await tgSend(`📋 Ejecutando ${tasks.length} tarea(s)...`);

  for (const task of tasks) {
    const shortId = task.id.slice(-6);
    console.log(`\n▶ [${shortId}] ${task.instruction.slice(0, 60)}...`);

    const { ok, output } = runClaude(task.instruction);
    const summary = output.slice(0, 800); // truncate for Telegram

    await prisma.adminTask.update({
      where: { id: task.id },
      data: {
        status: ok ? "done" : "skipped",
        result: output,
        doneAt: new Date(),
      },
    });

    const emoji = ok ? "✅" : "⚠️";
    await tgSend(
      `${emoji} *[${shortId}]* ${task.instruction.slice(0, 60)}\n\n${summary}`
    );

    console.log(`${emoji} Completada: ${ok}`);
  }

  await prisma.$disconnect();
  console.log("\n✅ Todas las tareas procesadas.");
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await tgSend(`❌ Error ejecutando tareas: ${err.message}`).catch(() => {});
  process.exit(1);
});
