/**
 * Discovery orchestrator — corre cada N horas vía cron:
 *
 *   1. Busca matches en Reddit (subreddits objetivo + keywords)
 *   2. Filtra los ya conocidos (DiscoveryMatch.unique[platform, externalId])
 *   3. Para cada nuevo: LLM scorer asigna score + razonamiento + draft
 *   4. Guarda en DB con status=pending
 *   5. Envía digest a Telegram con top matches (score >= 7)
 *
 * El "agente" no publica nada: Mario aprueba/rechaza/edita desde
 * /admin/distribution y publica manualmente con un click.
 */

import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";
import { discoverRedditMatches, type RedditPost } from "./reddit";
import { scoreAndDraft } from "./llm-scorer";

const MIN_NOTIFY_SCORE = 7;
const MAX_NOTIFY_PER_RUN = 5;

export type DiscoveryRunResult = {
  found: number;
  newCandidates: number;
  scored: number;
  notified: number;
  errors: string[];
};

export async function runDiscoveryCycle(): Promise<DiscoveryRunResult> {
  const result: DiscoveryRunResult = {
    found: 0,
    newCandidates: 0,
    scored: 0,
    notified: 0,
    errors: [],
  };

  const prisma = getPrismaClient();

  // 1) Buscar matches en Reddit
  let reddit: RedditPost[] = [];
  try {
    reddit = await discoverRedditMatches();
    result.found = reddit.length;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "reddit_unknown";
    result.errors.push(`reddit:${msg}`);
    logError("DISCOVERY", e, { stage: "reddit_discover" });
  }

  if (reddit.length === 0) {
    logInfo("DISCOVERY", "no_matches_found", {});
    return result;
  }

  // 2) Filtrar los ya conocidos
  const ids = reddit.map((p) => p.externalId);
  const existing = await prisma.discoveryMatch.findMany({
    where: { platform: "reddit", externalId: { in: ids } },
    select: { externalId: true },
  });
  const knownSet = new Set(existing.map((e) => e.externalId));
  const fresh = reddit.filter((p) => !knownSet.has(p.externalId));
  result.newCandidates = fresh.length;

  if (fresh.length === 0) {
    logInfo("DISCOVERY", "all_known", { found: reddit.length });
    return result;
  }

  // 3-4) Para cada nuevo: scoring + persist
  const toNotify: Array<{ id: string; row: RedditPost; score: number }> = [];

  for (const post of fresh) {
    const scoring = await scoreAndDraft({
      platform: post.platform,
      subredditOrTag: post.subreddit,
      title: post.title,
      excerpt: post.excerpt,
    });

    if (scoring) result.scored++;

    try {
      const saved = await prisma.discoveryMatch.create({
        data: {
          platform: post.platform,
          externalId: post.externalId,
          externalUrl: post.externalUrl,
          subredditOrTag: post.subreddit,
          title: post.title,
          excerpt: post.excerpt,
          authorHandle: post.authorHandle,
          postedAt: post.postedAt,
          matchedKeywords: post.matchedKeywords,
          llmScore: scoring?.score ?? null,
          llmReason: scoring?.reason ?? null,
          draftResponse: scoring?.draftResponse ?? null,
        },
        select: { id: true, llmScore: true },
      });

      if (scoring && scoring.score >= MIN_NOTIFY_SCORE && toNotify.length < MAX_NOTIFY_PER_RUN) {
        toNotify.push({ id: saved.id, row: post, score: scoring.score });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "persist_unknown";
      result.errors.push(`persist:${post.externalId}:${msg}`);
      logError("DISCOVERY", e, { stage: "persist", externalId: post.externalId });
    }
  }

  // 5) Notificar a Telegram
  if (toNotify.length > 0) {
    try {
      toNotify.sort((a, b) => b.score - a.score);
      const lines = [
        `🎯 *Discovery* — ${toNotify.length} oportunidad${toNotify.length === 1 ? "" : "es"} encontrada${toNotify.length === 1 ? "" : "s"}`,
        ``,
      ];
      for (const m of toNotify) {
        lines.push(`*${m.score}/10* — ${m.row.subreddit}`);
        lines.push(`${m.row.title.slice(0, 80)}${m.row.title.length > 80 ? "…" : ""}`);
        lines.push(`${m.row.externalUrl}`);
        lines.push("");
      }
      lines.push(`Revisar y aprobar: https://tresmilmillonesdelatidos.es/admin/distribution`);
      await notifyAdmin(lines.join("\n"));

      const notifiedIds = toNotify.map((m) => m.id);
      await prisma.discoveryMatch.updateMany({
        where: { id: { in: notifiedIds } },
        data: { notifiedAt: new Date() },
      });
      result.notified = toNotify.length;
    } catch (e) {
      result.errors.push(`telegram:${e instanceof Error ? e.message : "unknown"}`);
      logError("DISCOVERY", e, { stage: "telegram_notify" });
    }
  }

  logInfo("DISCOVERY", "cycle_complete", result);
  return result;
}
