import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { createCheckoutSession } from "@/services/billing";
import { getStripePriceId } from "@/lib/plans";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);

    const rl = checkRateLimit(`billing:checkout:${identity.userId}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const body = (await req.json()) as { interval?: string };
    const interval = body.interval === "annual" ? "annual" : "monthly";
    const priceId = getStripePriceId(interval === "annual" ? "pro_annual" : "pro_monthly");

    const checkoutUrl = await createCheckoutSession({
      userId: identity.userId,
      priceId,
      interval,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    logError("BILLING", error, { route: "/api/billing/checkout" });
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
