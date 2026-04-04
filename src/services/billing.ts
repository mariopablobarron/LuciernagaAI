/**
 * Billing service — wraps Stripe operations and syncs with our DB.
 * All Stripe interactions go through here; routes stay thin.
 */

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { STRIPE_TRIAL_DAYS } from "@/lib/plans";

const APP_BASE_URL = () =>
  process.env.APP_BASE_URL?.trim() || "http://localhost:3000";

// ─── Customer ─────────────────────────────────────────────────────────────────

/**
 * Finds or creates a Stripe customer for the given userId.
 * Persists stripeCustomerId on the User row.
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });

  if (!user) throw new Error(`[Billing] User not found: ${userId}`);
  if (user.stripeCustomerId) return user.stripeCustomerId;

  
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  logInfo("BILLING", "stripe_customer_created", { userId, customerId: customer.id });
  return customer.id;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession(params: {
  userId: string;
  priceId: string;
  interval: "monthly" | "annual";
}): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(params.userId);
  
  const base = APP_BASE_URL();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: STRIPE_TRIAL_DAYS,
      metadata: { userId: params.userId, interval: params.interval },
    },
    success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/precios?cancelled=1`,
    allow_promotion_codes: true,
    locale: "es",
    metadata: { userId: params.userId },
  });

  logInfo("BILLING", "checkout_session_created", {
    userId: params.userId,
    sessionId: session.id,
    priceId: params.priceId,
  });

  if (!session.url) throw new Error("[Billing] No checkout URL from Stripe");
  return session.url;
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

export async function createPortalSession(userId: string): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId);
  
  const base = APP_BASE_URL();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/app`,
  });

  logInfo("BILLING", "portal_session_created", { userId, customerId });
  return session.url;
}

// ─── Webhook sync ─────────────────────────────────────────────────────────────

/**
 * Syncs a Stripe subscription to our Subscription table.
 * Creates or upserts based on stripeSubscriptionId.
 */
export async function syncSubscription(
  stripeSub: Stripe.Subscription
): Promise<void> {
  const prisma = getPrismaClient();
  const userId = stripeSub.metadata?.userId;

  if (!userId) {
    // Try to find via customer
    const customer = await prisma.user.findFirst({
      where: { stripeCustomerId: stripeSub.customer as string },
      select: { id: true },
    });
    if (!customer) {
      logError("BILLING", new Error("No userId in subscription metadata"), {
        subscriptionId: stripeSub.id,
        customerId: stripeSub.customer,
      });
      return;
    }
  }

  const resolvedUserId =
    userId ||
    (
      await prisma.user.findFirst({
        where: { stripeCustomerId: stripeSub.customer as string },
        select: { id: true },
      })
    )?.id;

  if (!resolvedUserId) return;

  const firstItem = stripeSub.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const interval = firstItem?.price?.recurring?.interval;
  const plan = "pro"; // All paid plans are pro for now

  const data = {
    userId: resolvedUserId,
    status: stripeSub.status,
    plan,
    stripeSubscriptionId: stripeSub.id,
    stripeCustomerId: stripeSub.customer as string,
    stripePriceId: priceId,
    currentPeriodStart: new Date((firstItem?.current_period_start ?? stripeSub.billing_cycle_anchor) * 1000),
    currentPeriodEnd: new Date((firstItem?.current_period_end ?? stripeSub.billing_cycle_anchor) * 1000),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    cancelledAt: stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000)
      : null,
  };

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: stripeSub.id },
    create: data,
    update: data,
  });

  // Keep stripeCustomerId on user in sync
  await prisma.user.update({
    where: { id: resolvedUserId },
    data: { stripeCustomerId: stripeSub.customer as string },
  }).catch(() => null);

  logInfo("BILLING", "subscription_synced", {
    userId: resolvedUserId,
    subscriptionId: stripeSub.id,
    status: stripeSub.status,
    plan,
    interval,
  });
}

// ─── Webhook verification ─────────────────────────────────────────────────────

export function constructWebhookEvent(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
