import { notFound } from "next/navigation";
import { getBuilderContent } from "@/lib/builder";
import BuilderContent from "@/components/BuilderContent";
import LandingPageDesign from "@/components/home/LandingPageDesign";

// Routes managed by the app — the catch-all must never intercept these
const BLOCKED_SEGMENTS = new Set([
  "app",
  "explore",
  "admin",
  "dashboard",
  "impulso",
  "api",
  "editor",
]);

// Always dynamic: Builder content can change at any time
export const dynamic = "force-dynamic";

export default async function BuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ page?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ page: segments }, sp] = await Promise.all([params, searchParams]);

  // Guard: hand off to Next.js 404 for known app routes
  if (segments?.[0] && BLOCKED_SEGMENTS.has(segments[0])) {
    notFound();
  }

  const urlPath = "/" + (segments?.join("/") ?? "");

  // Builder passes ?builder.preview=<model> when editing in the visual editor
  const isBuilderPreview = "builder.preview" in sp;

  const content = await getBuilderContent("page", urlPath);

  if (!content && !isBuilderPreview) {
    // Render landing design for root path when Builder content is unavailable
    if (urlPath === "/") {
      return <LandingPageDesign />;
    }
    notFound();
  }

  return <BuilderContent model="page" content={content} />;
}
