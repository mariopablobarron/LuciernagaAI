import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { notifyIndexNow, notifyIndexNowFromSitemap, getIndexNowKey } from "@/services/seo/indexnow";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seo/submit
 *   body: { urls?: string[]; all?: boolean }
 *
 * Notifica URLs a IndexNow (Bing+Yandex+otros). Tres modos:
 *   - urls=[...]   → notifica solo esas URLs
 *   - all=true     → notifica todas las URLs del sitemap.xml
 *   - sin args     → 400
 *
 * GET /api/admin/seo/submit
 *   → devuelve estado de configuración (hay key?, URL del keyLocation)
 */

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  const key = getIndexNowKey();
  return NextResponse.json({
    configured: !!key,
    keyLocation: key ? "https://tresmilmillonesdelatidos.es/api/seo/indexnow-key" : null,
    keyMasked: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : null,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json().catch(() => ({}))) as { urls?: string[]; all?: boolean };

    if (body.all) {
      const result = await notifyIndexNowFromSitemap();
      return NextResponse.json(result);
    }

    if (Array.isArray(body.urls) && body.urls.length > 0) {
      const result = await notifyIndexNow(body.urls);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Provide urls[] or all=true" }, { status: 400 });
  } catch (error) {
    logError("SEO", error, { action: "submit" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
