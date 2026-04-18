import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import {
  CONTENT_TYPES,
  getUserContentTimeline,
  typeLabel,
  type ContentType,
} from "@/services/userContentTimeline";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VALID_TYPE_SET = new Set<ContentType>(CONTENT_TYPES);
const EXPORT_LIMIT = 10_000;

/**
 * GET /api/admin/users/[id]/content/export?format=csv|txt&types=...
 * Downloads the full content timeline as CSV or TXT. No truncation.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = requireAdminPermission(req, "users:export-pdf");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });

    const url = req.nextUrl;
    const format = url.searchParams.get("format") === "txt" ? "txt" : "csv";
    const typesParam = url.searchParams.get("types");
    const includeAssistant = url.searchParams.get("includeAssistant") === "true";

    const types = typesParam
      ? typesParam
          .split(",")
          .map((t) => t.trim())
          .filter((t): t is ContentType => VALID_TYPE_SET.has(t as ContentType))
      : undefined;

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const items = await getUserContentTimeline({
      userId: id,
      types: types && types.length > 0 ? types : undefined,
      limit: EXPORT_LIMIT,
      includeAssistantMessages: includeAssistant,
    });

    const auth = resolveAdminAuth(req);
    audit({
      actorId: auth.adminId ?? "unknown",
      actorType: "admin",
      action: "export",
      resource: "UserContent",
      resourceId: id,
      metadata: { format, count: items.length, types: types ?? "all" },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const safeName = (user.name ?? user.email.split("@")[0]).replace(/[^\w.-]+/g, "_").slice(0, 40);

    if (format === "csv") {
      const headers = ["createdAt", "type", "content", "metadata"];
      const rows = items.map((i) => [
        i.createdAt.toISOString(),
        typeLabel(i.type),
        i.content,
        JSON.stringify(i.metadata),
      ]);
      const csv = toCsv(headers, rows);
      return csvResponse(csv, `contenido-${safeName}-${stamp}.csv`);
    }

    // TXT — human readable
    const lines: string[] = [];
    lines.push(`Contenido completo · ${user.name ?? user.email}`);
    lines.push(`Exportado ${new Date().toISOString()}`);
    lines.push(`${items.length} entradas`);
    lines.push("");
    lines.push("=".repeat(60));
    for (const item of items) {
      lines.push("");
      lines.push(`[${item.createdAt.toISOString()}] ${typeLabel(item.type)}`);
      if (Object.keys(item.metadata).length > 0) {
        lines.push(`  ${JSON.stringify(item.metadata)}`);
      }
      lines.push("");
      lines.push(item.content);
      lines.push("");
      lines.push("-".repeat(60));
    }
    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="contenido-${safeName}-${stamp}.txt"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/users/[id]/content/export" });
    return NextResponse.json(
      { error: "EXPORT_FAILED", message: "No se pudo exportar el contenido." },
      { status: 500 },
    );
  }
}
