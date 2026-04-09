import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { getRecipientsBySegment } from "@/services/marketing-segments";
import { sendUserEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const VALID_SEGMENTS = ["all", "active_7d", "inactive_7d", "pro", "free", "crisis"];

function isValidSegment(segment: string): boolean {
  return VALID_SEGMENTS.includes(segment) || segment.startsWith("state:");
}

/** Synthetic / placeholder emails that should never receive campaigns. */
function isSyntheticEmail(email: string): boolean {
  return (
    email.endsWith("@example.com") ||
    email.endsWith("@test.com") ||
    email.endsWith(".test") ||
    email.startsWith("synthetic+") ||
    email.startsWith("noreply+")
  );
}

export const POST = withRateLimit(async function POST(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "marketing:campaign");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const body = await req.json() as { subject?: string; body?: string; segment?: string };
    const { subject, body: emailBody, segment } = body;

    // Validate subject
    if (!subject || typeof subject !== "string" || subject.length < 1 || subject.length > 200) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Subject must be between 1 and 200 characters." },
        { status: 400 },
      );
    }

    // Validate body
    if (!emailBody || typeof emailBody !== "string" || emailBody.length < 1 || emailBody.length > 50000) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Body must be between 1 and 50000 characters." },
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

    // Get recipients and filter out synthetic emails
    const recipients = await getRecipientsBySegment(segment);
    const emailRecipients = recipients.filter(
      (r) => r.email && !isSyntheticEmail(r.email),
    );

    // Create BroadcastLog with channel "email"
    const log = await prisma.broadcastLog.create({
      data: {
        channel: "email",
        segment,
        message: emailBody,
        subject,
        recipientCount: emailRecipients.length,
        successCount: 0,
        failureCount: 0,
        status: "sending",
        sentBy: "admin",
      },
    });

    let successCount = 0;
    let failureCount = 0;

    // Send emails with 100ms delay between each
    for (const recipient of emailRecipients) {
      try {
        const ok = await sendUserEmail({
          to: recipient.email,
          subject,
          html: emailBody,
          text: emailBody.replace(/<[^>]*>/g, ""),
        });
        if (ok) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch {
        failureCount++;
      }
      await new Promise((r) => setTimeout(r, 100));
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
    logError("MARKETING_CAMPAIGN", error, { route: "/api/admin/marketing/campaign" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to send email campaign." },
      { status: 500 },
    );
  }
}, { limit: 2, windowMs: 600_000 });
