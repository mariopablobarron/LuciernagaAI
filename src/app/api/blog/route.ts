import { type NextRequest, NextResponse } from "next/server";
import { listPublishedPosts } from "@/services/blog-listing";

export const dynamic = "force-dynamic";

// GET /api/blog — public listing of published posts.
//
// La lógica real vive en src/services/blog-listing.ts (compartida con
// /blog/page.tsx server component y con el sitemap dinámico). Aquí solo
// mapeamos query params → llamada al servicio → JSON.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(20, Math.max(1, parseInt(searchParams.get("pageSize") ?? "9", 10)));
  const tag = searchParams.get("tag") ?? "";
  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value ?? "es";

  const { posts, pagination, effectiveLocale, fallback } = await listPublishedPosts({
    locale: localeCookie,
    page,
    pageSize,
    tag,
  });

  return NextResponse.json({
    posts,
    pagination,
    // Telemetría útil para el frontend: si effectiveLocale ≠ locale pedido,
    // sabemos que estamos sirviendo el fallback en español.
    locale: effectiveLocale,
    fallback,
  });
}
