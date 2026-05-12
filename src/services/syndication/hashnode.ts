/**
 * Hashnode API client — publishes a blog post with canonical URL preserved.
 *
 * Required env vars:
 *   HASHNODE_API_KEY         Personal Access Token from
 *                            https://hashnode.com/settings/developer
 *   HASHNODE_PUBLICATION_ID  ID of the publication to post to.
 *                            Get it from your publication URL or via the
 *                            GraphQL API: query { me { publications { id } } }
 *
 * Docs: https://apidocs.hashnode.com/
 */

import { logWarn } from "@/lib/logger";

export type HashnodePublishResult =
  | { ok: true; externalId: string; externalUrl: string }
  | { ok: false; error: string; skipped?: boolean };

export type HashnodePostInput = {
  title: string;
  contentMarkdown: string;
  tags: string[];
  canonicalUrl: string;
  slug: string;
  coverImage?: string | null;
  subtitle?: string | null;
};

const API_URL = "https://gql.hashnode.com";

const PUBLISH_MUTATION = `
mutation PublishPost($input: PublishPostInput!) {
  publishPost(input: $input) {
    post {
      id
      url
      slug
    }
  }
}
`;

/**
 * Hashnode tag input requires an existing tag id OR a `name`+`slug` combo.
 * We use the latter — Hashnode auto-creates tags as needed.
 */
function buildTagsInput(tags: string[]): Array<{ slug: string; name: string }> {
  const seen = new Set<string>();
  const out: Array<{ slug: string; name: string }> = [];
  for (const t of tags) {
    const slug = t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, name: t.trim() });
    if (out.length >= 5) break;
  }
  return out;
}

export async function publishToHashnode(input: HashnodePostInput): Promise<HashnodePublishResult> {
  const apiKey = process.env.HASHNODE_API_KEY?.trim();
  const publicationId = process.env.HASHNODE_PUBLICATION_ID?.trim();
  if (!apiKey || !publicationId) {
    logWarn("SYNDICATION", "hashnode_no_credentials", {
      reason: !apiKey ? "HASHNODE_API_KEY missing" : "HASHNODE_PUBLICATION_ID missing",
    });
    return {
      ok: false,
      error: "HASHNODE_API_KEY or HASHNODE_PUBLICATION_ID not set",
      skipped: true,
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: PUBLISH_MUTATION,
        variables: {
          input: {
            publicationId,
            title: input.title,
            subtitle: input.subtitle || undefined,
            contentMarkdown: input.contentMarkdown,
            slug: input.slug,
            tags: buildTagsInput(input.tags),
            originalArticleURL: input.canonicalUrl,
            coverImageOptions: input.coverImage ? { coverImageURL: input.coverImage } : undefined,
            settings: {
              enableTableOfContent: true,
              isNewsletterActivated: false,
              delisted: false,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Hashnode HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      data?: { publishPost?: { post?: { id?: string; url?: string } } };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      return { ok: false, error: `Hashnode GraphQL: ${json.errors[0]?.message ?? "unknown"}` };
    }

    const post = json.data?.publishPost?.post;
    if (!post?.id || !post.url) {
      return { ok: false, error: "Hashnode response missing post id/url" };
    }

    return { ok: true, externalId: post.id, externalUrl: post.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
