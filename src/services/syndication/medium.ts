/**
 * Medium API client — publishes a blog post to Mario's Medium account
 * with canonical URL pointing back to the original blog.
 *
 * Required env vars:
 *   MEDIUM_INTEGRATION_TOKEN  Personal integration token from
 *                             https://medium.com/me/settings/security
 *
 * Note: Medium's integration tokens have been deprecated for new accounts
 * since 2024. Existing tokens still work. If unable to obtain a token, this
 * platform is marked as "skipped" in the orchestrator and we log a warning.
 *
 * Docs (legacy): https://github.com/Medium/medium-api-docs
 */

import { logWarn } from "@/lib/logger";

export type MediumPublishResult =
  | { ok: true; externalId: string; externalUrl: string }
  | { ok: false; error: string; skipped?: boolean };

export type MediumPostInput = {
  title: string;
  contentMarkdown: string;
  tags: string[]; // max 5, will be truncated
  canonicalUrl: string;
};

const API_BASE = "https://api.medium.com/v1";

async function getUserId(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { id?: string } };
    return json.data?.id ?? null;
  } catch {
    return null;
  }
}

export async function publishToMedium(input: MediumPostInput): Promise<MediumPublishResult> {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN?.trim();
  if (!token) {
    logWarn("SYNDICATION", "medium_no_token", { reason: "MEDIUM_INTEGRATION_TOKEN not configured" });
    return { ok: false, error: "MEDIUM_INTEGRATION_TOKEN not set", skipped: true };
  }

  const userId = await getUserId(token);
  if (!userId) {
    return { ok: false, error: "Could not resolve Medium user id (token invalid?)" };
  }

  try {
    const res = await fetch(`${API_BASE}/users/${userId}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        contentFormat: "markdown",
        content: input.contentMarkdown,
        tags: input.tags.slice(0, 5),
        canonicalUrl: input.canonicalUrl,
        publishStatus: "public",
        notifyFollowers: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Medium API ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { data?: { id?: string; url?: string } };
    if (!json.data?.id || !json.data.url) {
      return { ok: false, error: "Medium response missing id/url" };
    }

    return { ok: true, externalId: json.data.id, externalUrl: json.data.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
