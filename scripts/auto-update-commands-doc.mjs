#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PACKAGE_JSON = path.join(ROOT, "package.json");
const DOC_PATH = path.join(ROOT, "docs/comandos-operativos.md");

const argv = new Set(process.argv.slice(2));
const CHECK_ONLY = argv.has("--check");

const npmDescriptions = {
  postinstall: "Ejecuta prisma generate despues de instalar dependencias.",
  dev: "Inicia Next.js en modo desarrollo.",
  build: "Genera el build de produccion de Next.js.",
  start: "Levanta el servidor en modo produccion.",
  lint: "Ejecuta ESLint.",
  test: "Ejecuta Jest una vez, en modo secuencial (--runInBand).",
  "test:watch": "Ejecuta Jest en modo watch.",
  "test:coverage": "Ejecuta Jest y genera cobertura.",
  "system-check": "Ejecuta scripts/system-check.sh (health + chat baseline).",
  "hardening:auto": "Ejecuta scripts/auto-update-hardening-board.mjs.",
  format: "Ejecuta Prettier en modo escritura (--write .).",
  "format:check": "Ejecuta Prettier en modo verificacion (--check .).",
  agent: "Ejecuta scripts/testing-agent.sh (modo por defecto).",
  "agent:run": "Testing agent en modo run (tests una vez).",
  "agent:watch": "Testing agent en modo watch.",
  "agent:health": "Testing agent en modo health.",
  "agent:monitor": "Testing agent en modo monitor (watch + health periodico).",
  "agent:ci": "Testing agent en modo ci.",
  "agent:audit": "Testing agent en modo audit.",
  "agent:hooks": "Testing agent en modo hooks.",
  "test:telegram": "Prueba envio Telegram (usa ADMIN_TELEGRAM_ID/TELEGRAM_CHAT_ID o getUpdates).",
  "backup:daily": "Backup diario PostgreSQL con compresion, checksum, retencion y latest.sql.gz.",
  "backup:restore:latest": "Restaura el ultimo backup en DATABASE_URL via psql.",
};

const operationalCommands = [
  {
    command: "npx prisma migrate deploy",
    action: "Aplica migraciones pendientes en DB de produccion.",
  },
  {
    command: "npx prisma generate",
    action: "Regenera Prisma Client desde schema.prisma.",
  },
  {
    command: "npx prisma studio",
    action: "Abre interfaz visual para explorar y editar datos.",
  },
  {
    command: "curl https://TU_DOMINIO/api/health",
    action: "Health check general del servicio.",
  },
  {
    command: "curl https://TU_DOMINIO/api/ready",
    action: "Readiness check para trafico real.",
  },
  {
    command: 'curl -X POST https://TU_DOMINIO/api/cron/reminders -H "x-cron-secret: TU_SECRETO"',
    action: "Ejecuta manualmente el job de recordatorios.",
  },
  {
    command: "curl -X GET https://api.telegram.org/bot<TOKEN>/getUpdates",
    action: "Consulta updates recientes del bot.",
  },
  {
    command:
      'curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage -d "chat_id=<ID>" --data-urlencode "text=..."',
    action: "Envia un mensaje manual por Telegram.",
  },
  {
    command:
      'curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://TU_DOMINIO/api/telegram/webhook"',
    action: "Registra o actualiza webhook de Telegram.",
  },
  {
    command: "crontab -e",
    action: "Edita tareas programadas del servidor.",
  },
  {
    command: "docker build -t mentor-web .",
    action: "Construye imagen Docker local.",
  },
  {
    command: "docker run --env-file .env -p 3000:3000 mentor-web",
    action: "Levanta contenedor local con variables de entorno.",
  },
  {
    command: "git rev-parse --short HEAD",
    action: "Muestra hash corto del commit actual.",
  },
  {
    command: "git status --short",
    action: "Muestra estado resumido de cambios locales.",
  },
  {
    command: "git diff",
    action: "Muestra diff de cambios no committeados.",
  },
];

function mdEscape(value) {
  return String(value).replace(/\|/g, "\\|");
}

function buildTable(rows) {
  const header = "| Comando | Accion |";
  const sep = "| --- | --- |";
  const body = rows
    .map((row) => `| ${mdEscape(row.command)} | ${mdEscape(row.action)} |`)
    .join("\n");
  return [header, sep, body].join("\n");
}

function buildDoc(pkg) {
  const scripts = pkg.scripts || {};
  const npmRows = Object.keys(scripts).map((name) => ({
    command: `npm run ${name}`,
    action: npmDescriptions[name] || `Ejecuta: ${scripts[name]}`,
  }));

  return [
    "# Comandos del proyecto",
    "",
    "Este documento se genera automaticamente. Solo se actualiza cuando detecta cambios reales.",
    "",
    "## Comandos npm",
    "",
    buildTable(npmRows),
    "",
    "## Comandos operativos (no npm)",
    "",
    buildTable(operationalCommands),
    "",
    "## Variables clave",
    "",
    "| Variable | Uso |",
    "| --- | --- |",
    "| DATABASE_URL | Backup/restore y Prisma. |",
    "| TELEGRAM_BOT_TOKEN | Envio de mensajes Telegram. |",
    "| ADMIN_TELEGRAM_ID / TELEGRAM_CHAT_ID | Destino de alertas o pruebas Telegram. |",
    "| CRON_SECRET | Seguridad para /api/cron/reminders. |",
    "",
  ].join("\n");
}

function main() {
  const pkgRaw = fs.readFileSync(PACKAGE_JSON, "utf8");
  const pkg = JSON.parse(pkgRaw);
  const nextDoc = buildDoc(pkg);
  const prevDoc = fs.existsSync(DOC_PATH) ? fs.readFileSync(DOC_PATH, "utf8") : "";

  if (prevDoc === nextDoc) {
    console.log("commands-doc: no changes");
    return;
  }

  if (CHECK_ONLY) {
    console.log("commands-doc: outdated");
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, nextDoc, "utf8");
  console.log("commands-doc: updated");
}

main();
