import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { isAgeBucket, type AgeBucket } from "@/lib/age-range";
import { setBlockedAgeState, setDeclaredAgeRange } from "@/lib/age-gate";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/declare-age
 * Body: { bucket: AgeBucket }
 *
 * If the user declares "under_14" we set a server-only "blocked" cookie and
 * return { blocked: true, redirect: "/menores" } — no DB row is touched.
 *
 * If the user declares a valid age range we persist it to:
 *   - the User row when there's a session,
 *   - the cookie for anonymous browsers (so the gate doesn't reappear).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const bucket = (body as { bucket?: unknown })?.bucket;
  if (!isAgeBucket(bucket)) {
    return NextResponse.json({ error: "INVALID_BUCKET" }, { status: 400 });
  }

  if (bucket === "under_14") {
    const res = NextResponse.json({ ok: true, blocked: true, redirect: "/menores" });
    setBlockedAgeState(res);
    logInfo("AGE_GATE", "declared_under_14", {});
    return res;
  }

  // bucket is now AgeRange (excluded "under_14" above).
  const ageRange = bucket as Exclude<AgeBucket, "under_14">;

  let userId: string | null = null;
  try {
    const identity = await resolveIdentity(req, { allowAnonymousBootstrap: false });
    userId = identity.userId;
  } catch {
    // anonymous is fine — we still set the cookie below
  }

  const res = NextResponse.json({ ok: true, ageRange });
  try {
    await setDeclaredAgeRange(res, ageRange, userId);
    logInfo("AGE_GATE", "declared_age_range", { hasUser: !!userId });
    return res;
  } catch (error) {
    logError("AGE_GATE", error, { route: "/api/auth/declare-age" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
