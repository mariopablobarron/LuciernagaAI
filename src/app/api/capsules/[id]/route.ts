import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { CapsuleAccessError, openCapsule } from "@/services/capsules";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withRateLimit(
  async function GET(req: NextRequest, ctx: unknown) {
    try {
      const identity = await resolveIdentity(req);
      const { id } = await (ctx as RouteContext).params;
      if (!id) return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });

      const result = await openCapsule(identity.userId, id);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
      }
      if (error instanceof CapsuleAccessError) {
        const status = error.reason === "NOT_FOUND" ? 404 : 403;
        return NextResponse.json({ error: error.reason }, { status });
      }
      logError("CAPSULES", error, { route: "/api/capsules/[id]", method: "GET" });
      return NextResponse.json({ error: "CAPSULE_OPEN_FAILED" }, { status: 500 });
    }
  },
  { limit: 60 },
);
