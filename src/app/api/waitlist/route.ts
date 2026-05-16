import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { consumeInviteCode } from "@/services/invites";
import { buildWaitlistWelcomeEmail, sendUserEmail } from "@/lib/email";
import { pickEmailLocale } from "@/lib/email-i18n";

const MAX_BODY_SIZE = 10 * 1024; // 10 KB

export async function POST(req: NextRequest) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = (await req.json()) as {
      email?: string;
      mission1?: string;
      mission2?: string;
      mission3?: string;
      inviteCode?: string;
      utm?: Record<string, string>;
      locale?: string;
    };

    const { email, mission1, mission2, mission3, inviteCode, utm } = body;
    // Locale del email: body.locale (cliente) → cookie NEXT_LOCALE → "es".
    const locale = pickEmailLocale(body.locale ?? req.cookies.get("NEXT_LOCALE")?.value);

    if (!email || !mission1 || !mission2 || !mission3) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const prisma = getPrismaClient();

    // If coming via invite, skip waitlist — mark invite as used
    if (inviteCode) {
      await consumeInviteCode(inviteCode, emailLower);
    }

    // Upsert so repeated submissions don't error
    const entry = await prisma.waitlistEntry.upsert({
      where: { email: emailLower },
      create: { email: emailLower, mission1, mission2, mission3, inviteCode },
      update: { mission1, mission2, mission3 },
    });

    logInfo("WAITLIST", "entry_created", { id: entry.id, email: emailLower, ...(utm && { utm }) });

    const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    sendUserEmail({ ...buildWaitlistWelcomeEmail({ to: emailLower, appUrl, locale }), template: "waitlist_welcome" }).catch(
      (e) => logError("WAITLIST", e, { action: "send_waitlist_welcome_email", email: emailLower }),
    );

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (error) {
    logError("WAITLIST", error, { action: "waitlist_submit" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
