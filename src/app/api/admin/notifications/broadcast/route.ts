import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { broadcastPush, type PushPayload } from "@/lib/web-push";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  body?: string;
  url?: string;
  channel?: string;
  audience?: "subscribed" | "all-active";
};

export const POST = withRateLimit(async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "notifications");
  if (auth instanceof NextResponse) return auth;

  let payload: Body;
  try {
    payload = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const title = (payload.title ?? "").trim();
  const body = (payload.body ?? "").trim();
  const url = (payload.url ?? "").trim() || undefined;
  const channel = (payload.channel ?? "system").trim() || "system";
  const audience: Body["audience"] = payload.audience ?? "subscribed";

  if (!title || title.length > 80) {
    return NextResponse.json({ error: "INVALID_TITLE" }, { status: 400 });
  }
  if (!body || body.length > 240) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (url && !/^\/[\w\-/]*/.test(url) && !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  const userIds = audience === "all-active"
    ? (await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      })).map((u) => u.id)
    : (await prisma.pushSubscription.findMany({
        select: { userId: true },
        distinct: ["userId"],
      })).map((s) => s.userId);

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No recipients" });
  }

  const push: PushPayload = { title, body, url, channel };

  try {
    await broadcastPush(userIds, push);
    logInfo("ADMIN", "push_broadcast_sent", {
      adminId: auth.adminId,
      audience,
      recipients: userIds.length,
      channel,
    });
    return NextResponse.json({ ok: true, sent: userIds.length });
  } catch (error) {
    logError("ADMIN", error, { action: "push_broadcast" });
    return NextResponse.json({ error: "BROADCAST_FAILED" }, { status: 500 });
  }
}, { limit: 5 });
