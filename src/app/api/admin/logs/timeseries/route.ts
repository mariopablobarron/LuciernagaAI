import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "logs";

type Bucket = { hour: string; total: number; byKey: Record<string, number> };

type Row = {
  bucket: Date;
  key: string | null;
  count: bigint;
};

function emptyBuckets(hours = 24): Bucket[] {
  const now = new Date();
  // Round down to current hour
  now.setMinutes(0, 0, 0);
  const out: Bucket[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 60 * 60 * 1000);
    out.push({ hour: h.toISOString(), total: 0, byKey: {} });
  }
  return out;
}

function mergeRows(buckets: Bucket[], rows: Row[]): Bucket[] {
  const byIso = new Map(buckets.map((b) => [b.hour, b]));
  for (const row of rows) {
    const iso = new Date(row.bucket).toISOString();
    const b = byIso.get(iso);
    if (!b) continue;
    const n = Number(row.count);
    b.total += n;
    const key = row.key ?? "unknown";
    b.byKey[key] = (b.byKey[key] ?? 0) + n;
  }
  return buckets;
}

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [systemRows, emailRows, cronRows, webhookRows] = await Promise.all([
      prisma.$queryRaw<Row[]>`
        SELECT date_trunc('hour', "timestamp") AS bucket, "level" AS key, COUNT(*)::bigint AS count
        FROM "SystemLog"
        WHERE "timestamp" >= ${since}
        GROUP BY bucket, "level"
        ORDER BY bucket ASC
      `,
      prisma.$queryRaw<Row[]>`
        SELECT date_trunc('hour', "createdAt") AS bucket, "status" AS key, COUNT(*)::bigint AS count
        FROM "EmailLog"
        WHERE "createdAt" >= ${since}
        GROUP BY bucket, "status"
        ORDER BY bucket ASC
      `,
      prisma.$queryRaw<Row[]>`
        SELECT date_trunc('hour', "startedAt") AS bucket, "status" AS key, COUNT(*)::bigint AS count
        FROM "CronRunLog"
        WHERE "startedAt" >= ${since}
        GROUP BY bucket, "status"
        ORDER BY bucket ASC
      `,
      prisma.$queryRaw<Row[]>`
        SELECT date_trunc('hour', "receivedAt") AS bucket, "source" AS key, COUNT(*)::bigint AS count
        FROM "WebhookLog"
        WHERE "receivedAt" >= ${since}
        GROUP BY bucket, "source"
        ORDER BY bucket ASC
      `,
    ]);

    return NextResponse.json({
      system: mergeRows(emptyBuckets(), systemRows),
      email: mergeRows(emptyBuckets(), emailRows),
      cron: mergeRows(emptyBuckets(), cronRows),
      webhook: mergeRows(emptyBuckets(), webhookRows),
    });
  } catch (err) {
    logError("ADMIN_LOGS", err, { route: "/api/admin/logs/timeseries" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
