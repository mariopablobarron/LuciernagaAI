import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { sendIntervention } from "@/features/admin-clinical/send-intervention";
import type { InterventionType, SendInterventionInput } from "@/features/admin-clinical/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: InterventionType[] = ["message", "recommendation", "resource", "assessment"];

function isValidType(v: unknown): v is InterventionType {
  return typeof v === "string" && (VALID_TYPES as string[]).includes(v);
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdminPermission(req, "interventions");
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json()) as Partial<SendInterventionInput>;

    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json({ error: "MISSING_USER_ID" }, { status: 400 });
    }
    if (!isValidType(body.type)) {
      return NextResponse.json(
        { error: "INVALID_TYPE", valid: VALID_TYPES },
        { status: 400 }
      );
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "MISSING_CONTENT" }, { status: 400 });
    }

    const adminId = process.env.ADMIN_USERNAME?.trim() ?? "admin";
    const result = await sendIntervention(
      { userId: body.userId, type: body.type, content: body.content.trim(), notify: body.notify ?? true },
      adminId
    );

    return NextResponse.json({ ok: true, interventionId: result.id }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("USER_NOT_FOUND")) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }
    logError("CLINICAL", err, { route: "/api/admin-clinical/intervention" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
