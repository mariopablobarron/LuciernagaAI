import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import {
  CAPSULE_LIMITS,
  InvalidLetterError,
  createLetterForUser,
  listCapsulesForUser,
} from "@/services/capsules";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(
  async function GET(req: NextRequest) {
    try {
      const identity = await resolveIdentity(req);
      const capsules = await listCapsulesForUser(identity.userId);
      return NextResponse.json({ capsules });
    } catch (error) {
      if (error instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
      }
      logError("CAPSULES", error, { route: "/api/capsules", method: "GET" });
      return NextResponse.json({ error: "CAPSULES_LIST_FAILED" }, { status: 500 });
    }
  },
  { limit: 60 },
);

export const POST = withRateLimit(
  async function POST(req: NextRequest) {
    try {
      const identity = await resolveIdentity(req);
      const body = (await req.json()) as { text?: string; deliverAt?: string };

      if (typeof body.text !== "string" || body.text.trim().length === 0) {
        return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });
      }
      if (typeof body.deliverAt !== "string") {
        return NextResponse.json({ error: "DELIVER_AT_REQUIRED" }, { status: 400 });
      }

      const deliverAt = new Date(body.deliverAt);
      if (Number.isNaN(deliverAt.getTime())) {
        return NextResponse.json({ error: "DELIVER_AT_INVALID" }, { status: 400 });
      }

      const created = await createLetterForUser(identity.userId, body.text, deliverAt);
      return NextResponse.json({ id: created.id, limits: CAPSULE_LIMITS });
    } catch (error) {
      if (error instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
      }
      if (error instanceof InvalidLetterError) {
        return NextResponse.json({ error: error.reason }, { status: 400 });
      }
      logError("CAPSULES", error, { route: "/api/capsules", method: "POST" });
      return NextResponse.json({ error: "CAPSULE_CREATE_FAILED" }, { status: 500 });
    }
  },
  { limit: 20 },
);
