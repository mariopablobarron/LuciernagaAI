import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminJson } from "@/lib/admin-response";
import { logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Purga el cache server-side de Next.js para todas las páginas.
 *
 * IMPORTANTE: Esto NO limpia el cache del navegador del usuario. Solo afecta
 * a las cachés que Next.js guarda en el servidor (route cache, fetch cache,
 * páginas generadas con ISR). El cliente sigue con su cache hasta que recarga.
 *
 * Para que el cliente recoja la nueva respuesta tras un purge:
 * - Si la página tiene `Cache-Control: no-store` → la próxima petición ya la trae fresh.
 * - Si no → el navegador puede seguir mostrando la versión vieja hasta que el
 *   usuario haga hard-reload (Cmd+Shift+R).
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  const startedAt = Date.now();

  try {
    revalidatePath("/", "layout");
  } catch (e) {
    return adminJson(
      { ok: false, error: "REVALIDATE_FAILED", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const elapsedMs = Date.now() - startedAt;
  logInfo("ADMIN_CACHE", "purge_executed", { elapsedMs });

  return adminJson({
    ok: true,
    elapsedMs,
    revalidated: { path: "/ (layout)" },
    note: "Cache server-side de Next.js purgado. El cache del navegador del usuario NO se ve afectado — los clientes seguirán con su versión hasta hacer reload.",
  });
}
