import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 60;

// GET /api/public/trackers/active
// Public, unauthenticated: lists active CustomTracker rows so the client can
// inject the right vendor scripts AFTER cookie consent. We expose only the
// minimum needed (provider, identifier, apiHost) — never id, notes or audit data.
export async function GET() {
  try {
    const prisma = getPrismaClient();
    const trackers = await prisma.customTracker.findMany({
      where: { isActive: true },
      select: { provider: true, identifier: true, apiHost: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ trackers }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    logError("PUBLIC_TRACKERS", error, { route: "/api/public/trackers/active" });
    return NextResponse.json({ trackers: [] }, { status: 200 });
  }
}
