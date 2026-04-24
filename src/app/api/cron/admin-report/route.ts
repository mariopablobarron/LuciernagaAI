import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { authorize, sendAdminReport, stubReport, type Report } from "@/lib/adminReport";

export const dynamic = "force-dynamic";

// GET /api/cron/admin-report?kind=<id>&secret=CRON_SECRET
//
// Endpoint multiplexado para los reportes programados. Cada kind ejecuta su
// check y envía el resultado al chat de Telegram admin (ADMIN_TELEGRAM_ID).
// Auth: ?secret=CRON_SECRET (mismo que /api/cron/referral-30d-active).
//
// Grupo A — funcionando con datos del propio app:
//   health-daily, dormant-weekly, email-capture-week,
//   usage-monthly, cta-app-2w, alerts-cleanup-1m
//
// Grupo B — stub (requieren API/credencial externa):
//   crons-status, webhook-errors, backup-verify, seo-weekly,
//   resend-deliverability, deps-audit, cost-watch
//
// Grupo C — NO van por este endpoint, son /schedule con agente Claude:
//   pending-checks, refactor-status, open-circles
const PROD_BASE_URL = "https://tresmilmillonesdelatidos.es";

const DORMANT_DAYS = 30;
const EMAIL_CAPTURE_WINDOW_DAYS = 7;
const USAGE_WINDOW_DAYS = 30;
const CTA_WINDOW_DAYS = 14;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!authorize(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind")?.trim() ?? "";
  if (!kind) {
    return NextResponse.json({ error: "kind required" }, { status: 400 });
  }

  try {
    const report = await runKind(kind);
    if (!report) {
      return NextResponse.json({ error: `unknown kind: ${kind}` }, { status: 400 });
    }
    const sent = await sendAdminReport(report);
    logInfo("ADMIN_REPORT", "report_sent", { kind, severity: report.severity, telegramOk: sent.ok });
    return NextResponse.json({ ok: true, kind, severity: report.severity, telegramOk: sent.ok });
  } catch (error) {
    logError("ADMIN_REPORT", error, { kind, route: "/api/cron/admin-report" });
    return NextResponse.json({ error: "REPORT_FAILED" }, { status: 500 });
  }
}

async function runKind(kind: string): Promise<Report | null> {
  switch (kind) {
    // ── Grupo A ────────────────────────────────────────────────────────────
    case "health-daily":
      return reportHealthDaily();
    case "dormant-weekly":
      return reportDormantWeekly();
    case "email-capture-week":
      return reportEmailCaptureWeek();
    case "usage-monthly":
      return reportUsageMonthly();
    case "cta-app-2w":
      return reportCtaApp2w();
    case "alerts-cleanup-1m":
      return reportAlertsCleanup1m();

    // ── Grupo B (stubs) ────────────────────────────────────────────────────
    case "crons-status":
      return stubReport("crons-status", ["CRONJOB_ORG_API_KEY"], "Llamar a https://api.cron-job.org/jobs y reportar últimas 7 ejecuciones por job.");
    case "webhook-errors":
      return stubReport("webhook-errors", ["COOLIFY_LOGS_TOKEN"], "Coolify v3 no expone API estable de logs; alternativa: enviar logs a Logtail/Better Stack y consultar su API.");
    case "backup-verify":
      return stubReport("backup-verify", ["BACKUP_VERIFY_URL"], "Crear endpoint que valide tamaño + estructura del último backup y consumirlo desde aquí.");
    case "seo-weekly":
      return stubReport("seo-weekly", ["GSC_OAUTH_REFRESH_TOKEN", "GSC_PROPERTY"], "OAuth con Google Search Console API; reportar top queries/páginas y caídas >20% vs semana anterior.");
    case "resend-deliverability":
      return stubReport("resend-deliverability", ["RESEND_API_KEY (con permisos analytics)"], "Llamar a https://api.resend.com/emails (stats endpoint) y reportar bounce/complaint rate.");
    case "deps-audit":
      return stubReport("deps-audit", ["GH_TOKEN"], "Recomendado: activar Dependabot en GitHub en lugar de cron HTTP. Si insistes: gh api /repos/.../vulnerability-alerts.");
    case "cost-watch":
      return stubReport("cost-watch", ["ANTHROPIC_BILLING_KEY"], "Anthropic no expone API pública de billing; alternativa: instrumentar usage por request en LlmLog y agregar aquí.");

    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo A — implementaciones
// ─────────────────────────────────────────────────────────────────────────────

async function reportHealthDaily(): Promise<Report> {
  const lines: string[] = [];
  let severity: Report["severity"] = "ok";

  try {
    const res = await fetch(`${PROD_BASE_URL}/api/health`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      checks?: { database?: string; env?: string; missingVars?: string[] };
      memory?: { heapUsedMb?: number; heapTotalMb?: number; rssMb?: number };
    };

    const status = json.status ?? "unknown";
    lines.push(`Estado global: *${status}*`);
    if (json.checks?.database) lines.push(`DB: ${json.checks.database}`);
    if (json.checks?.env) lines.push(`Env: ${json.checks.env}`);
    if (json.checks?.missingVars?.length) {
      lines.push(`Faltan envs: ${json.checks.missingVars.join(", ")}`);
    }
    if (json.memory?.rssMb) {
      lines.push(`Memoria RSS: ${json.memory.rssMb} MB · Heap ${json.memory.heapUsedMb}/${json.memory.heapTotalMb} MB`);
    }

    if (status === "down") severity = "alert";
    else if (status === "degraded") severity = "warn";
  } catch (error) {
    severity = "alert";
    lines.push(`No se pudo consultar /api/health: ${(error as Error).message}`);
  }

  return { kind: "health-daily", severity, title: "Health diario de producción", lines };
}

async function reportDormantWeekly(): Promise<Report> {
  const prisma = getPrismaClient();
  const cutoff = new Date(Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000);

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    lastSeen: { lt: cutoff },
    messages: { none: {} },
    telegramId: null,
    googleId: null,
    pushSubscriptions: { none: {} },
    OR: [
      { passwordHash: null },
      { email: { endsWith: "@session.latidos.local" } },
      { email: { endsWith: "@session.luciernaga.local" } },
    ],
  };

  const total = await prisma.user.count({ where });
  const severity: Report["severity"] = total > 500 ? "warn" : "ok";

  return {
    kind: "dormant-weekly",
    severity,
    title: "Anónimos dormidos (dry-run)",
    lines: [
      `Candidatos a purga: *${total}*`,
      `Criterio: sin mensajes, sin canal, lastSeen < ${cutoff.toISOString().slice(0, 10)}`,
      `Acción manual: POST /api/admin/users/purge-anonymous-dormant (dryRun=1 para verificar; sin flag para ejecutar)`,
    ],
  };
}

async function reportEmailCaptureWeek(): Promise<Report> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - EMAIL_CAPTURE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [totalCreated, withRealEmail, withSyntheticEmail] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({
      where: {
        createdAt: { gte: since },
        AND: [
          { email: { not: { endsWith: "@session.latidos.local" } } },
          { email: { not: { endsWith: "@session.luciernaga.local" } } },
        ],
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: since },
        OR: [
          { email: { endsWith: "@session.latidos.local" } },
          { email: { endsWith: "@session.luciernaga.local" } },
        ],
      },
    }),
  ]);

  const captureRate = totalCreated > 0 ? Math.round((withRealEmail / totalCreated) * 1000) / 10 : 0;
  const severity: Report["severity"] = captureRate < 5 ? "warn" : "ok";

  return {
    kind: "email-capture-week",
    severity,
    title: `Captura de email (últimos ${EMAIL_CAPTURE_WINDOW_DAYS} días)`,
    lines: [
      `Usuarios nuevos: *${totalCreated}*`,
      `Con email real: *${withRealEmail}* (${captureRate}%)`,
      `Aún anónimos: ${withSyntheticEmail}`,
      `Política activa: LAXA (goal/action/>3 msgs/trigger)`,
    ],
  };
}

async function reportUsageMonthly(): Promise<Report> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [totalMessages, anonMessages, regMessages, activeUsers] = await Promise.all([
    prisma.message.count({ where: { createdAt: { gte: since } } }),
    prisma.message.count({
      where: {
        createdAt: { gte: since },
        user: {
          OR: [
            { email: { endsWith: "@session.latidos.local" } },
            { email: { endsWith: "@session.luciernaga.local" } },
          ],
        },
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: since },
        user: {
          AND: [
            { email: { not: { endsWith: "@session.latidos.local" } } },
            { email: { not: { endsWith: "@session.luciernaga.local" } } },
          ],
        },
      },
    }),
    prisma.user.count({ where: { lastSeen: { gte: since }, deletedAt: null } }),
  ]);

  return {
    kind: "usage-monthly",
    severity: "info",
    title: `Uso del mentor (últimos ${USAGE_WINDOW_DAYS} días)`,
    lines: [
      `Mensajes totales: *${totalMessages}*`,
      `Anónimos: ${anonMessages} · Registrados: ${regMessages}`,
      `Usuarios activos (lastSeen <${USAGE_WINDOW_DAYS}d): *${activeUsers}*`,
    ],
  };
}

async function reportCtaApp2w(): Promise<Report> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - CTA_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [totalNew, withSource, viaApp, viaSignup] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since }, source: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: since }, source: "app" } }),
    prisma.user.count({ where: { createdAt: { gte: since }, source: "signup" } }),
  ]);

  return {
    kind: "cta-app-2w",
    severity: "info",
    title: `Resultado CTA /app vs /signup (últimos ${CTA_WINDOW_DAYS} días)`,
    lines: [
      `Total altas: *${totalNew}* (${withSource} con campo source)`,
      `Vía /app: ${viaApp}`,
      `Vía /signup: ${viaSignup}`,
      `Recordatorio: este reporte está pensado como one-shot (commits e61d794, 26d9dd3).`,
    ],
  };
}

async function reportAlertsCleanup1m(): Promise<Report> {
  return {
    kind: "alerts-cleanup-1m",
    severity: "info",
    title: "Recordatorio: revisar alertas Telegram (1er msg / nombre)",
    lines: [
      `Han pasado ~30 días desde el commit 4ce6146 que añadió el aviso "anónimo envía 1er mensaje" + "pone nombre".`,
      `Acción sugerida: revisar volumen recibido. Si es ruido > señal, abrir PR para silenciarlo o añadir throttling.`,
      `Este reporte es one-shot — desactiva la routine en /schedule tras leerlo.`,
    ],
  };
}
