import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { resolveAgeState } from "@/lib/age-gate";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/age-state
 *
 * Returns the user's current age-gate state. Used by the AgeGate client
 * component to decide whether to show the declaration screen.
 *
 * Response shape:
 *   { kind: "unknown" }
 *   { kind: "blocked" }
 *   { kind: "declared", ageRange: "14_17" | "18_29" | ... }
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const identity = await resolveIdentity(req, { allowAnonymousBootstrap: false });
      userId = identity.userId;
    } catch {
      // anonymous — fall back to cookie
    }
    const state = await resolveAgeState(req, userId);
    return NextResponse.json(state);
  } catch (error) {
    logError("AGE_GATE", error, { route: "/api/auth/age-state" });
    return NextResponse.json({ kind: "unknown" });
  }
}
