import { type NextRequest, NextResponse } from "next/server";
import { sendAutomatedAlert } from "@/lib/alerts";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Detector de commits sin desplegar.
 *
 * Coolify v3 no tiene auto-deploy fiable (su webhook está roto desde abril)
 * y los pushes a `main` requieren click manual en "Force Redeploy". Este
 * endpoint compara la versión actualmente desplegada con el HEAD de `main`
 * en GitHub y, si lleva pendiente más de PENDING_THRESHOLD_MS, manda
 * una alerta via Telegram/email.
 *
 * Pensado para llamarse desde cron-job.org cada 1 hora con `?secret=CRON_SECRET`.
 *
 * Funciona con dos modos de versión:
 * - SHA real (si Coolify expone SOURCE_COMMIT al build): compara SHAs literales.
 * - Timestamp `t<ms>` (fallback de next.config.ts): compara contra timestamp
 *   del commit en GitHub.
 *
 * Idempotente: usa dedupeKey con el SHA del commit pendiente para no spamear.
 */

const PENDING_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 horas
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 horas — re-avisa si sigue pendiente
const REPO = "mariopablobarron/LuciernagaAI";

type GitHubCommit = {
  sha: string;
  commit: { author: { date: string }; message: string };
  html_url: string;
};

function parseBuildTimestampMs(buildVersion: string): number | null {
  if (buildVersion.startsWith("t")) {
    const ms = Number(buildVersion.slice(1));
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "unknown";
  const coolifyAppUrl =
    process.env.COOLIFY_APP_URL?.trim() ||
    "http://72.61.195.108:3000/applications/cmnc4qjph0006p2a3ggmfdflz";

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });

    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => "");
      logError("CHECK_PENDING_DEPLOY", new Error(`GitHub API ${ghRes.status}: ${text.slice(0, 200)}`));
      return NextResponse.json({ ok: false, error: "GITHUB_API_ERROR", status: ghRes.status }, { status: 502 });
    }

    const head = (await ghRes.json()) as GitHubCommit;
    const commitTimeMs = Date.parse(head.commit.author.date);
    const ageMs = Date.now() - commitTimeMs;
    const headSha = head.sha;
    const headShortSha = headSha.slice(0, 7);

    // Detección de "diferentes":
    // - Si el build tiene un SHA real (no empieza por 't'): comparar SHAs.
    // - Si es timestamp: el build es más antiguo que el commit por más de 60s.
    let isPending: boolean;
    let comparison: string;
    const buildTimeMs = parseBuildTimestampMs(buildVersion);
    if (buildTimeMs === null) {
      // SHA real
      isPending = !buildVersion.startsWith(headShortSha) && !headSha.startsWith(buildVersion);
      comparison = "sha";
    } else {
      isPending = commitTimeMs > buildTimeMs + 60_000;
      comparison = "timestamp";
    }

    // Sin diferencia → estamos al día.
    if (!isPending) {
      logInfo("CHECK_PENDING_DEPLOY", "up_to_date", { buildVersion, headSha });
      return NextResponse.json({
        ok: true,
        pending: false,
        buildVersion,
        head: { sha: headSha, date: head.commit.author.date },
        comparison,
      });
    }

    // Hay diff pero aún es reciente — no alertes todavía.
    if (ageMs < PENDING_THRESHOLD_MS) {
      logInfo("CHECK_PENDING_DEPLOY", "pending_but_recent", { ageMinutes: Math.round(ageMs / 60_000) });
      return NextResponse.json({
        ok: true,
        pending: true,
        reason: "below_threshold",
        ageMinutes: Math.round(ageMs / 60_000),
        thresholdMinutes: PENDING_THRESHOLD_MS / 60_000,
        head: { sha: headSha, date: head.commit.author.date },
      });
    }

    // Pendiente y maduro — alertar (con dedupe por SHA + ventana de cooldown).
    const ageHours = Math.round(ageMs / (60 * 60 * 1000));
    const subjectLine = head.commit.message.split("\n")[0]?.slice(0, 80) ?? "(sin asunto)";
    const dispatched = await sendAutomatedAlert(
      {
        type: "warning",
        title: "Deploy pendiente desde hace " + ageHours + "h",
        message:
          `El último commit en \`main\` (\`${headShortSha}\`) lleva ${ageHours}h sin desplegar.\n\n` +
          `*Asunto:* ${subjectLine}\n\n` +
          `[Ver commit en GitHub](${head.html_url})\n[Force Redeploy en Coolify](${coolifyAppUrl})`,
      },
      {
        dedupeKey: `pending-deploy:${headShortSha}`,
        cooldownMs: ALERT_COOLDOWN_MS,
      },
    );

    logInfo("CHECK_PENDING_DEPLOY", "alert_processed", { headShortSha, ageHours, dispatched });

    return NextResponse.json({
      ok: true,
      pending: true,
      alerted: dispatched,
      ageHours,
      head: { sha: headSha, date: head.commit.author.date, subject: subjectLine },
    });
  } catch (err) {
    logError("CHECK_PENDING_DEPLOY", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
