import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, resolveAdminAuth } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import {
  CONTENT_TYPES,
  getUserContentTimeline,
  type ContentType,
} from "@/services/userContentTimeline";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VALID_TYPE_SET = new Set<ContentType>(CONTENT_TYPES);

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
    }

    const auth = resolveAdminAuth(req);
    audit({
      actorId: auth.adminId ?? "unknown",
      actorType: "admin",
      action: "read",
      resource: "UserContent",
      resourceId: id,
    });

    const url = req.nextUrl;
    const typesParam = url.searchParams.get("types");
    const limitParam = url.searchParams.get("limit");
    const includeAssistant = url.searchParams.get("includeAssistant") === "true";

    const types = typesParam
      ? (typesParam
          .split(",")
          .map((t) => t.trim())
          .filter((t): t is ContentType => VALID_TYPE_SET.has(t as ContentType)))
      : undefined;

    const limit = Math.min(Math.max(Number(limitParam ?? 500), 1), 2000);

    const items = await getUserContentTimeline({
      userId: id,
      types: types && types.length > 0 ? types : undefined,
      limit,
      includeAssistantMessages: includeAssistant,
    });

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        content: i.content,
        metadata: i.metadata,
        createdAt: i.createdAt.toISOString(),
        linkPath: i.linkPath,
      })),
      total: items.length,
      limit,
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/users/[id]/content" });
    return NextResponse.json(
      { error: "CONTENT_FAILED", message: "No se pudo cargar el contenido." },
      { status: 500 },
    );
  }
}
