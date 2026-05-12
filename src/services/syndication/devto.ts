/**
 * Dev.to API client — publishes a blog post with canonical URL preserved.
 *
 * Required env vars:
 *   DEVTO_API_KEY  Personal API key from https://dev.to/settings/extensions
 *
 * Docs: https://developers.forem.com/api/v1#tag/articles/operation/createArticle
 */

import { logWarn } from "@/lib/logger";

export type DevtoPublishResult =
  | { ok: true; externalId: string; externalUrl: string }
  | { ok: false; error: string; skipped?: boolean };

export type DevtoPostInput = {
  title: string;
  bodyMarkdown: string;
  tags: string[]; // max 4 on Dev.to, alphanumeric only
  canonicalUrl: string;
  coverImage?: string | null;
  description?: string | null;
};

const API_BASE = "https://dev.to/api";

/**
 * Dev.to requires tags to be alphanumeric (no spaces, no hyphens).
 * We normalize and de-duplicate.
 */
function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const norm = t
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 30);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
    if (out.length >= 4) break;
  }
  return out;
}

export async function publishToDevto(input: DevtoPostInput): Promise<DevtoPublishResult> {
  const apiKey = process.env.DEVTO_API_KEY?.trim();
  if (!apiKey) {
    logWarn("SYNDICATION", "devto_no_key", { reason: "DEVTO_API_KEY not configured" });
    return { ok: false, error: "DEVTO_API_KEY not set", skipped: true };
  }

  try {
    const res = await fetch(`${API_BASE}/articles`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        article: {
          title: input.title,
          body_markdown: input.bodyMarkdown,
          published: true,
          tags: normalizeTags(input.tags),
          canonical_url: input.canonicalUrl,
          main_image: input.coverImage || undefined,
          description: input.description || undefined,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Dev.to API ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { id?: number; url?: string };
    if (!json.id || !json.url) {
      return { ok: false, error: "Dev.to response missing id/url" };
    }

    return { ok: true, externalId: String(json.id), externalUrl: json.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
