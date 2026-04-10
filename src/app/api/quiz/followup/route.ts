import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { scheduleQuizFollowup } from "@/services/onboarding-emails";
import { logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const rl = checkRateLimit(`quiz-followup:${email}`, 3, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: true }); // silent — don't reveal rate limit
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ ok: true }); // no user yet — can't schedule
  }

  await scheduleQuizFollowup(user.id);
  logInfo("QUIZ", "followup_scheduled", { email });
  return NextResponse.json({ ok: true });
}
