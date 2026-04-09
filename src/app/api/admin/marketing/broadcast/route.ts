import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { getRecipientsBySegment } from "@/services/marketing-segments";
import { sendTelegramMessageAsync } from "@/services/telegram";

export const dynamic = "force-dynamic";

const VALID_SEGMENTS = ["all", "active_7d", "inactive_7d", "pro", "free", "crisis"];

function isValidSegment(segment: string): boolean {
  return VALID_SEGMENTS.includes(segment) || segment.startsWith("state:");
}

export const POST = withRateLimit(async function POST(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "marketing:broadcast");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const body = await req.json() as { message?: string; segment?: string };
    const { message, segment } = body;

    // Validate message
    if (!message || typeof message !== "string" || message.length < 1 || message.length > 4096) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Message must be between 1 and 4096 characters." },
        { status: 400 },
      );
    }

    // Validate segment
    if (!segment || typeof segment !== "string" || !isValidSegment(segment)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: `Invalid segment. Must be one of: ${VALID_SEGMENTS.join(", ")}, or start with "state:".` },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Get recipients and filter to those with a telegramId
    const recipients = await getRecipientsBySegment(segment);
    const telegramRecipients = recipients.filter(
      (r) => r.telegramId != null && r.telegramId !== "",
    );

    // Create BroadcastLog with status "sending"
    const log = await prisma.broadcastLog.create({
      data: {
        channel: "telegram",
        segment,
        message,
        recipientCount: telegramRecipients.length,
        successCount: 0,
        failureCount: 0,
        status: "sending",
        sentBy: "admin",
      },
    });

    let successCount = 0;
    let failureCount = 0;

    // Send messages with 50ms delay between each
    for (const recipient of telegramRecipients) {
      try {
        const ok = await sendTelegramMessageAsync(recipient.telegramId!, message);
        if (ok) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch {
        failureCount++;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    // Update BroadcastLog with final counts
    const updatedLog = await prisma.broadcastLog.update({
      where: { id: log.id },
      data: {
        successCount,
        failureCount,
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error: unknown) {
    logError("MARKETING_BROADCAST", error, { route: "/api/admin/marketing/broadcast" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to send broadcast." },
      { status: 500 },
    );
  }
}, { limit: 3, windowMs: 300_000 });
