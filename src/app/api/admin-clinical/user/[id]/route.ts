import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { getClinicalUserDetail } from "@/features/admin-clinical/repository";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = resolveAdminAuth(req);
    if (!auth.authenticated) {
      const res = NextResponse.json({ error: "UNAUTHORIZED_ADMIN" }, { status: 401 });
      if (auth.source === "invalid") clearAdminSessionCookie(res);
      return res;
    }

    const { id } = await params;
    const detail = await getClinicalUserDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err: unknown) {
    logError("CLINICAL", err, { route: "/api/admin-clinical/user/[id]" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
