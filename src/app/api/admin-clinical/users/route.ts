import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { getClinicalUserList } from "@/features/admin-clinical/repository";

export const dynamic = "force-dynamic";

function parsePositiveInt(v: string | null, fallback: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
}

export async function GET(req: NextRequest) {
  try {
    const auth = resolveAdminAuth(req);
    if (!auth.authenticated) {
      const res = NextResponse.json({ error: "UNAUTHORIZED_ADMIN" }, { status: 401 });
      if (auth.source === "invalid") clearAdminSessionCookie(res);
      return res;
    }

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state")?.trim() || "all";
    const riskOnly = searchParams.get("risk") === "1";
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 50), 200);

    const { items, total } = await getClinicalUserList({ state, riskOnly, page, pageSize });
    const totalPages = Math.ceil(total / pageSize) || 0;

    return NextResponse.json({
      items,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (err: unknown) {
    logError("CLINICAL", err, { route: "/api/admin-clinical/users" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
