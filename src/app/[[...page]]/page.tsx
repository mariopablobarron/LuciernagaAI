import { notFound } from "next/navigation";
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

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const { page: segments } = await params;

  if (segments?.[0] && BLOCKED_SEGMENTS.has(segments[0])) {
    notFound();
  }

  const urlPath = "/" + (segments?.join("/") ?? "");

  if (urlPath === "/") {
    return <LandingPageDesign />;
  }

  notFound();
}
