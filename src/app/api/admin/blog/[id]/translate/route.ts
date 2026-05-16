// POST /api/admin/blog/[id]/translate
//
// Genera (o regenera) traducciones EN/PT/FR del post fuente en español.
// Es síncrono — el caller debe esperar la respuesta (puede tardar 15–45s).
// El frontend muestra un spinner mientras se genera.
//
// Body opcional:
//   { force?: boolean, targetLocales?: ("en"|"pt"|"fr")[] }
// - force=true: sobrescribe posts existentes en los target locales.
// - targetLocales: subset de [en, pt, fr] para regenerar solo algunos.
//
// Respuesta:
//   { results: TranslationOutcome[] }
// con status por idioma: created | skipped_exists | regenerated | error.

import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import {
  translatePostToAllLocales,
  TARGET_LOCALES,
  type TargetLocale,
} from "@/services/blog-translator";

export const dynamic = "force-dynamic";

// Timeout más alto que el default (10s) — la traducción puede tardar.
// Vercel Pro permite hasta 300s; en Coolify/Node es ilimitado.
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      force?: boolean;
      targetLocales?: string[];
    };

    // Filtrar a solo locales válidos.
    const requested = Array.isArray(body.targetLocales)
      ? body.targetLocales.filter((l): l is TargetLocale =>
          (TARGET_LOCALES as readonly string[]).includes(l),
        )
      : undefined;

    const results = await translatePostToAllLocales(id, {
      force: Boolean(body.force),
      targetLocales: requested && requested.length > 0 ? requested : undefined,
    });

    return NextResponse.json({ results });
  } catch (err) {
    logError("BLOG_TRANSLATOR", err, { route: "/api/admin/blog/[id]/translate" });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translation failed" },
      { status: 500 },
    );
  }
}
