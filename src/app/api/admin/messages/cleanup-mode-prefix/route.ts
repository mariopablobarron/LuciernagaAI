import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { audit } from "@/lib/audit";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Limpia la deuda histórica creada por el bug en el que el cliente
// prefijaba el mensaje del usuario con la instrucción del modo de
// acompañamiento. Patrón a recortar:
//   [Modo de acompañamiento: "X" — ...]\n\n<mensaje real>
// Dry-run por defecto. `?apply=1` aplica la limpieza.
const PREFIX_PATTERN = /^\s*\[Modo de acompañamiento:[^\]]+\]\s*\n+/;

export async function POST(req: NextRequest) {
  try {
    const adminAuth = requireAdminPermission(req, "users:write");
    if (adminAuth instanceof NextResponse) return adminAuth;
    const auth = resolveAdminAuth(req);

    const apply = req.nextUrl.searchParams.get("apply") === "1";
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 5000), 20000);

    const prisma = getPrismaClient();
    const candidates = await prisma.message.findMany({
      where: {
        role: "user",
        content: { startsWith: "[Modo de acompañamiento:" },
      },
      select: { id: true, content: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const toUpdate: { id: string; newContent: string }[] = [];
    for (const m of candidates) {
      const cleaned = m.content.replace(PREFIX_PATTERN, "").trim();
      if (cleaned && cleaned !== m.content) {
        toUpdate.push({ id: m.id, newContent: cleaned });
      }
    }

    if (apply && toUpdate.length > 0) {
      // Updates individuales en serie — volumen esperado bajo (<1000).
      for (const u of toUpdate) {
        await prisma.message.update({
          where: { id: u.id },
          data: { content: u.newContent },
        });
      }
    }

    audit({
      actorId: auth.adminId ?? "unknown",
      actorType: "admin",
      action: apply ? "update" : "read",
      resource: "Message",
      resourceId: "cleanup-mode-prefix",
      metadata: { apply, scanned: candidates.length, wouldUpdate: toUpdate.length },
    });

    logInfo("admin.messages", "cleanup_mode_prefix", {
      apply,
      scanned: candidates.length,
      flagged: toUpdate.length,
    });

    return NextResponse.json({
      ok: true,
      apply,
      scanned: candidates.length,
      flagged: toUpdate.length,
      sample: toUpdate.slice(0, 5).map((u) => ({
        id: u.id,
        preview: u.newContent.slice(0, 120),
      })),
    });
  } catch (error) {
    logError("admin.messages", "cleanup_mode_prefix_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
