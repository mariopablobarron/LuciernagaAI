#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANUAL_PATH = path.join(ROOT, "docs/manual-saas-50p.md");
const PLAN_START_ISO = "2026-03-30";

const WEEK_COMMANDS = {
  1: ["npm run lint", "npm run test", "npm run system-check"],
  2: ["npm run lint", "npm run test"],
  3: ["npm run lint", "npm run test", "npm run build"],
  4: ["npm run lint", "npm run test", "npm run test:coverage"],
  5: ["npm run lint", "npm run test", "npm run build"],
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateOnly(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function isoTime(d) {
  return d.toISOString();
}

function getWeekInfo(today) {
  const start = new Date(`${PLAN_START_ISO}T00:00:00Z`);
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const rawWeek = Math.floor(days / 7) + 1;
  const week = Math.max(1, Math.min(5, rawWeek));
  const weekStart = new Date(start.getTime() + (week - 1) * 7 * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
  return { week, weekStart, weekEnd };
}

function runCommand(command) {
  try {
    execSync(command, { stdio: "pipe", encoding: "utf8" });
    return { command, ok: true, detail: "ok" };
  } catch (error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const tail = `${stdout}\n${stderr}`.trim().split("\n").slice(-4).join(" | ");
    return { command, ok: false, detail: tail || "error" };
  }
}

function sanitizeCell(value, maxLen = 180) {
  const clean = String(value)
    .replace(/\|/g, "/")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 3)}...`;
}

function buildEvidence(results) {
  const checks = results
    .map((r) => `${r.command.replace("npm run ", "")}:${r.ok ? "ok" : "fail"}`)
    .join(",");
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "local-run";
  return sanitizeCell(`auto(${checks}) ${runUrl}`);
}

function updateWeekRow(content, payload) {
  const lines = content.split("\n");
  const rowPrefix = `| Semana ${payload.week} |`;
  const rowIndex = lines.findIndex((line) => line.startsWith(rowPrefix));
  if (rowIndex === -1) {
    throw new Error(`No se encontro la fila de Semana ${payload.week} en el tablero`);
  }

  const sprint = `Sprint ${payload.week}`;
  const owners = {
    1: "Backend",
    2: "Backend/DevOps",
    3: "Backend/Infra",
    4: "Backend",
    5: "Backend",
  };

  const headerIndex = lines.findIndex(
    (line) => line.includes("| Semana") && line.includes("| Sprint")
  );
  const separatorLine = headerIndex >= 0 ? lines[headerIndex + 1] : "";
  const widths = separatorLine
    ? separatorLine
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.length)
    : [];

  const values = [
    `Semana ${payload.week}`,
    sprint,
    owners[payload.week],
    payload.status,
    payload.startDate,
    payload.targetDate,
    payload.blocker,
    payload.evidence,
    payload.updatedAt,
  ];

  if (widths.length === values.length) {
    const alignedCells = values.map((value, index) => {
      const rawWidth = widths[index];
      const innerWidth = Math.max(1, rawWidth - 2);
      const text = sanitizeCell(value, innerWidth);
      return ` ${text.padEnd(innerWidth, " ")} `;
    });
    lines[rowIndex] = `|${alignedCells.join("|")}|`;
  } else {
    lines[rowIndex] =
      `| Semana ${payload.week} | ${sprint} | ${owners[payload.week]} | ${sanitizeCell(payload.status)} | ${sanitizeCell(payload.startDate)} | ${sanitizeCell(payload.targetDate)} | ${sanitizeCell(payload.blocker)} | ${sanitizeCell(payload.evidence)} | ${sanitizeCell(payload.updatedAt)} |`;
  }

  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(MANUAL_PATH)) {
    throw new Error(`No existe ${MANUAL_PATH}`);
  }

  const now = new Date();
  const { week, weekEnd } = getWeekInfo(now);
  const commands = WEEK_COMMANDS[week] || WEEK_COMMANDS[1];
  const results = commands.map(runCommand);
  const failed = results.find((r) => !r.ok);
  const doneRequested = process.env.AUTO_HARDENING_MARK_DONE === "true";

  const status = failed ? "bloqueado" : doneRequested ? "hecho" : "en_curso";
  const blocker = failed ? sanitizeCell(`${failed.command}: ${failed.detail}`) : "-";
  const evidence = buildEvidence(results);
  const updatedAt = isoTime(now);
  const targetDate = dateOnly(weekEnd);

  const existing = fs.readFileSync(MANUAL_PATH, "utf8");
  const startRegex = new RegExp(`\\| Semana ${week} \\|[^\\n]*\\|`, "m");
  const startMatch = existing.match(startRegex);
  let startDate = dateOnly(now);

  if (startMatch) {
    const cols = startMatch[0].split("|").map((c) => c.trim());
    const currentStart = cols[5] || "-";
    startDate = currentStart && currentStart !== "-" ? currentStart : dateOnly(now);
  }

  const updated = updateWeekRow(existing, {
    week,
    status,
    startDate,
    targetDate,
    blocker,
    evidence,
    updatedAt,
  });

  fs.writeFileSync(MANUAL_PATH, updated, "utf8");

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `week=${week}\n`, "utf8");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`, "utf8");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `blocker=${blocker}\n`, "utf8");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `updatedAt=${updatedAt}\n`, "utf8");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `targetDate=${targetDate}\n`, "utf8");
  }

  process.stdout.write(`Semana ${week} actualizada con estado=${status}\n`);
}

main();
