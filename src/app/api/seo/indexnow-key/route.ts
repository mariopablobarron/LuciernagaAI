import { type NextRequest, NextResponse } from "next/server";
import { getIndexNowKey } from "@/services/seo/indexnow";

export const dynamic = "force-dynamic";

/**
 * GET /api/seo/indexnow-key
 *
 * Sirve la clave INDEXNOW_KEY como text/plain. Esta URL se referencia en
 * `keyLocation` de cada POST a IndexNow. Bing/Yandex hacen GET aquí para
 * validar que controlamos el dominio antes de aceptar submissions.
 *
 * Si no hay key configurada → 404 (degradación graciosa).
 */
export async function GET(_req: NextRequest) {
  const key = getIndexNowKey();
  if (!key) return new NextResponse("IndexNow no configurado", { status: 404 });
  return new NextResponse(key, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
