/**
 * Syndication orchestrator — re-publishes a BlogPost to external platforms
 * (Medium, Dev.to, Hashnode) with canonical URL preserved.
 *
 * Why canonical URL matters: Google attributes SEO value to the canonical
 * source. Without it, syndicated copies may outrank the original or cause
 * duplicate-content penalties.
 *
 * Execution model:
 *   - Called from the admin PUT endpoint when status transitions to "published"
 *     (best-effort, non-blocking — caller does `void syndicatePost(id)`).
 *   - Also exposed via manual trigger `POST /api/admin/blog/[id]/syndicate`
 *     for retries and back-fills.
 *
 * Each platform attempt is idempotent at the row level: a BlogSyndication
 * row with (blogPostId, platform) already in status="success" is skipped
 * unless `force=true`.
 */

import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { blocksToMarkdown } from "./blocks-to-markdown";
import { publishToMedium } from "./medium";
import { publishToDevto } from "./devto";
import { publishToHashnode } from "./hashnode";

const SITE_ORIGIN = "https://tresmilmillonesdelatidos.es";

export type Platform = "medium" | "devto" | "hashnode";

export const ALL_PLATFORMS: Platform[] = ["medium", "devto", "hashnode"];

export type SyndicationResult = {
  platform: Platform;
  status: "success" | "failed" | "skipped";
  externalUrl?: string;
  error?: string;
};

type BlogPostForSyndication = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  blocks: Prisma.JsonValue;
  coverImage: string | null;
  tags: string[];
  status: string;
};

function buildMarkdown(post: BlogPostForSyndication): string {
  const fromBlocks = blocksToMarkdown(post.blocks);
  return fromBlocks ?? post.content.trim();
}

function canonicalUrlFor(slug: string): string {
  return `${SITE_ORIGIN}/blog/${slug}`;
}

async function attemptPlatform(
  platform: Platform,
  post: BlogPostForSyndication,
  markdown: string,
): Promise<SyndicationResult> {
  const canonical = canonicalUrlFor(post.slug);

  try {
    if (platform === "medium") {
      const r = await publishToMedium({
        title: post.title,
        contentMarkdown: markdown,
        tags: post.tags,
        canonicalUrl: canonical,
      });
      if (r.ok) return { platform, status: "success", externalUrl: r.externalUrl };
      return { platform, status: r.skipped ? "skipped" : "failed", error: r.error };
    }

    if (platform === "devto") {
      const r = await publishToDevto({
        title: post.title,
        bodyMarkdown: markdown,
        tags: post.tags,
        canonicalUrl: canonical,
        coverImage: post.coverImage,
        description: post.excerpt,
      });
      if (r.ok) return { platform, status: "success", externalUrl: r.externalUrl };
      return { platform, status: r.skipped ? "skipped" : "failed", error: r.error };
    }

    if (platform === "hashnode") {
      const r = await publishToHashnode({
        title: post.title,
        contentMarkdown: markdown,
        tags: post.tags,
        canonicalUrl: canonical,
        slug: post.slug,
        coverImage: post.coverImage,
        subtitle: post.excerpt,
      });
      if (r.ok) return { platform, status: "success", externalUrl: r.externalUrl };
      return { platform, status: r.skipped ? "skipped" : "failed", error: r.error };
    }

    return { platform, status: "failed", error: "unknown_platform" };
  } catch (e) {
    return { platform, status: "failed", error: e instanceof Error ? e.message : "exception" };
  }
}

export async function syndicatePost(
  postId: string,
  options: { platforms?: Platform[]; force?: boolean } = {},
): Promise<SyndicationResult[]> {
  const prisma = getPrismaClient();
  const platforms = options.platforms ?? ALL_PLATFORMS;

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      blocks: true,
      coverImage: true,
      tags: true,
      status: true,
    },
  });

  if (!post) {
    logWarn("SYNDICATION", "post_not_found", { postId });
    return [];
  }

  if (post.status !== "published") {
    logWarn("SYNDICATION", "post_not_published", { postId, status: post.status });
    return [];
  }

  const markdown = buildMarkdown(post);
  if (!markdown.trim()) {
    logWarn("SYNDICATION", "post_empty_content", { postId });
    return [];
  }

  const existing = await prisma.blogSyndication.findMany({
    where: { blogPostId: postId, platform: { in: platforms } },
  });
  const existingByPlatform = new Map(existing.map((s) => [s.platform, s]));

  const results: SyndicationResult[] = [];

  for (const platform of platforms) {
    const prior = existingByPlatform.get(platform);
    if (prior && prior.status === "success" && !options.force) {
      results.push({
        platform,
        status: "skipped",
        externalUrl: prior.externalUrl ?? undefined,
        error: "already_published",
      });
      continue;
    }

    const result = await attemptPlatform(platform, post, markdown);
    results.push(result);

    // Upsert the syndication row
    await prisma.blogSyndication.upsert({
      where: { blogPostId_platform: { blogPostId: postId, platform } },
      create: {
        blogPostId: postId,
        platform,
        status: result.status,
        externalUrl: result.externalUrl,
        errorMessage: result.error,
        succeededAt: result.status === "success" ? new Date() : null,
      },
      update: {
        status: result.status,
        externalUrl: result.externalUrl ?? prior?.externalUrl,
        errorMessage: result.error,
        attemptedAt: new Date(),
        succeededAt: result.status === "success" ? new Date() : prior?.succeededAt,
      },
    });

    if (result.status === "success") {
      logInfo("SYNDICATION", "published", { postId, platform, url: result.externalUrl });
    } else if (result.status === "failed") {
      logError("SYNDICATION", new Error(result.error ?? "unknown"), { postId, platform });
    }
  }

  return results;
}
