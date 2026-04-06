import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PLANS } from "@/lib/stripe";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // Require authenticated user
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Inicia sesión primero" }, { status: 401 });
    }
    throw e;
  }

  try {
    const { plan = "pro_monthly" } = (await req.json()) as { plan?: string };
    const stripePlan = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
    if (!stripePlan) return NextResponse.json({ error: "Plan no válido" }, { status: 400 });

    // Use authenticated user's email
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { email: true },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      locale: "es",
      line_items: [{ price: stripePlan.priceId, quantity: 1 }],
      customer_email: user?.email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { plan, userId: identity.userId },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios?upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logError("STRIPE", error, { route: "/api/billing/checkout" });
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
  }
}
