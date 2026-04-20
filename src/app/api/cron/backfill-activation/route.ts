import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

// GET /api/cron/backfill-activation?secret=CRON_SECRET&limit=500
//
// Idempotent. Run on demand (or once after the migration lands) to populate
// the new User audit fields retroactively:
//   - firstMessageSentAt ← MIN(Message.createdAt) where role='user'
//   - activatedAt        ← now() when messageCount ≥ 3 AND ≥1 action completada
//   - onboardingCompletedAt ← consentAt (pragmatic proxy until the wizard
//                             ships a real "completed" signal)
//
// Safe to call multiple times — skips rows already populated.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 5000) : 500;

  const prisma = getPrismaClient();
  const stats = { firstMessage: 0, activated: 0, onboarding: 0, scanned: 0 };

  try {
    // 1. firstMessageSentAt — infer from earliest user-authored message.
    const missingFirst = await prisma.user.findMany({
      where: { firstMessageSentAt: null, deletedAt: null },
      select: { id: true },
      take: limit,
    });
    for (const u of missingFirst) {
      const earliest = await prisma.message.findFirst({
        where: { userId: u.id, role: "user" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (!earliest) continue;
      await prisma.user.updateMany({
        where: { id: u.id, firstMessageSentAt: null },
        data: { firstMessageSentAt: earliest.createdAt },
      });
      stats.firstMessage += 1;
    }

    // 2. activatedAt — messageCount≥3 AND ≥1 action completada.
    const missingActivation = await prisma.user.findMany({
      where: {
        activatedAt: null,
        deletedAt: null,
        messageCount: { gte: 3 },
      },
      select: { id: true },
      take: limit,
    });
    for (const u of missingActivation) {
      const completed = await prisma.action.findFirst({
        where: { completed: true, goal: { userId: u.id } },
        select: { id: true },
      });
      if (!completed) continue;
      await prisma.user.updateMany({
        where: { id: u.id, activatedAt: null },
        data: { activatedAt: new Date() },
      });
      stats.activated += 1;
    }

    // 3. onboardingCompletedAt ← consentAt (pragmatic; replace when wizard
    //    ships a real "completed" hook).
    const missingOnboarding = await prisma.user.findMany({
      where: {
        onboardingCompletedAt: null,
        consentAt: { not: null },
        deletedAt: null,
      },
      select: { id: true, consentAt: true },
      take: limit,
    });
    for (const u of missingOnboarding) {
      if (!u.consentAt) continue;
      await prisma.user.updateMany({
        where: { id: u.id, onboardingCompletedAt: null },
        data: { onboardingCompletedAt: u.consentAt },
      });
      stats.onboarding += 1;
    }

    stats.scanned = missingFirst.length + missingActivation.length + missingOnboarding.length;
    logInfo("BACKFILL_ACTIVATION", "done", stats);
    return NextResponse.json({ ok: true, stats, limit });
  } catch (err: unknown) {
    logError("BACKFILL_ACTIVATION", err, { area: "run" });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
