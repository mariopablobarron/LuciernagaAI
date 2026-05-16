import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { withCronLog } from "@/lib/cron-log";
import { requireCronSecret } from "@/lib/cron-auth";
import {
  buildWeeklyLetterNotificationEmail,
  sendUserEmail,
} from "@/lib/email";
import { pickEmailLocale } from "@/lib/email-i18n";
import {
  buildWeeklyDigest,
  computeWeekWindow,
  isDigestUsable,
} from "@/services/weekly-letter-digest";
import {
  composeWeeklyLetter,
  InsufficientMaterialError,
  QuoteNotGroundedError,
} from "@/services/weekly-letter-composer";
import {
  listEligibleUsers,
  shouldSendNotification,
} from "@/services/weekly-letter-eligibility";
import { getUserCrisisStatus } from "@/services/state";

/**
 * GET /api/cron/weekly-letter?secret=CRON_SECRET
 *
 * Weekly. Runs Sunday ~19:00 Europe/Madrid to generate the in-app letter
 * covering the just-finished ISO week (Mon-Sun UTC), then sends a short
 * email notification (no letter content) to users who opted in.
 *
 * Supports dry-run via `?dryRun=1` or `WEEKLY_LETTER_DRY_RUN=true` env:
 * letters are persisted with `published=false` and emails are NOT sent.
 * Admin can review content and flip `published` when satisfied.
 */
export const GET = withCronLog("weekly-letter", async (req) => {
  const unauthorized = requireCronSecret(req as NextRequest);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const dryRun =
    url.searchParams.get("dryRun") === "1" ||
    process.env.WEEKLY_LETTER_DRY_RUN === "true";

  const now = new Date();
  const { weekStart, weekEnd } = computeWeekWindow(now);

  const candidates = await listEligibleUsers({ weekStart });
  logInfo("WEEKLY_LETTER", "cohort_resolved", {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    candidateCount: candidates.length,
    dryRun,
  });

  const prisma = getPrismaClient();
  const counters = {
    generated: 0,
    skipped_no_material: 0,
    skipped_below_activity: 0,
    skipped_no_messages: 0,
    skipped_crisis: 0,
    skipped_quote_not_grounded: 0,
    failed: 0,
    emails_sent: 0,
    emails_skipped: 0,
  };

  for (const candidate of candidates) {
    try {
      // Crisis takes precedence — do not send a generic weekly letter while
      // the user is in crisis. Respect the active crisis flow.
      const crisis = await getUserCrisisStatus(candidate.userId).catch(() => null);
      if (crisis?.active) {
        counters.skipped_crisis += 1;
        continue;
      }

      const digest = await buildWeeklyDigest({
        userId: candidate.userId,
        reference: now,
      });

      if (!isDigestUsable(digest)) {
        if (digest.reason === "no_messages") counters.skipped_no_messages += 1;
        else if (digest.reason === "below_activity_threshold") counters.skipped_below_activity += 1;
        else counters.skipped_no_material += 1;
        continue;
      }

      let letter;
      try {
        letter = await composeWeeklyLetter(digest);
      } catch (composeError) {
        if (composeError instanceof InsufficientMaterialError) {
          counters.skipped_no_material += 1;
          continue;
        }
        if (composeError instanceof QuoteNotGroundedError) {
          counters.skipped_quote_not_grounded += 1;
          continue;
        }
        throw composeError;
      }

      const saved = await prisma.weeklyLetter.create({
        data: {
          userId: candidate.userId,
          weekStart: digest.weekStart,
          weekEnd: digest.weekEnd,
          subject: letter.subject,
          body: letter.body,
          quotes: digest.quotes,
          state: digest.dominantState,
          published: !dryRun, // dry-run: withhold from UI
        },
        select: { id: true, published: true },
      });
      counters.generated += 1;

      if (saved.published && shouldSendNotification(candidate)) {
        try {
          const mail = buildWeeklyLetterNotificationEmail({
            name: candidate.name,
            letterId: saved.id,
            appUrl: process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es",
            locale: pickEmailLocale(candidate.locale),
          });
          const ok = await sendUserEmail({
            to: candidate.email!, // shouldSendNotification guaranteed non-null
            userId: candidate.userId,
            template: "weekly-letter-notification",
            ...mail,
          });
          if (ok) {
            counters.emails_sent += 1;
            await prisma.weeklyLetter.update({
              where: { id: saved.id },
              data: { emailNotifiedAt: new Date() },
            });
          } else {
            counters.emails_skipped += 1;
          }
        } catch (mailError) {
          counters.emails_skipped += 1;
          logError("WEEKLY_LETTER", mailError, {
            userId: candidate.userId,
            stage: "notify_email",
          });
        }
      } else {
        counters.emails_skipped += 1;
      }
    } catch (userError) {
      counters.failed += 1;
      logError("WEEKLY_LETTER", userError, {
        userId: candidate.userId,
        stage: "per_user_processing",
      });
    }
  }

  logInfo("WEEKLY_LETTER", "cron_completed", {
    weekStart: weekStart.toISOString(),
    dryRun,
    ...counters,
  });

  return {
    response: NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      dryRun,
      ...counters,
    }),
    recordsProcessed: counters.generated,
    metadata: {
      weekStart: weekStart.toISOString(),
      dryRun,
      ...counters,
    },
  };
});
