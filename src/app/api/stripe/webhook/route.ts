import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getPrismaClient } from '@/db/prisma';
import { notifyAdmin, buildAdminAlert } from '@/services/telegram';
import { logError, logInfo, logWarn } from '@/lib/logger';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Finds user by stripeCustomerId OR email (fallback for race conditions where
 * checkout.session.completed hasn't linked the customer yet).
 */
async function findUser(stripeCustomerId: string, email?: string | null) {
  const prisma = getPrismaClient();

  let user = await prisma.user.findFirst({
    where: { stripeCustomerId },
    select: { id: true, email: true },
  });

  if (!user && email) {
    user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true },
    });
    // Save the stripeCustomerId so future lookups are fast
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }
  }

  return user;
}

async function upgradeToPro(sub: Stripe.Subscription, email?: string | null) {
  const prisma = getPrismaClient();
  const firstItem = sub.items.data[0];

  const user = await findUser(sub.customer as string, email);
  if (!user) {
    logWarn('BILLING', 'webhook_user_not_found', {
      customerId: sub.customer,
      email,
    });
    return null;
  }

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId: user.id,
      plan: 'pro',
      status: sub.status,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: sub.customer as string,
      stripePriceId: firstItem?.price?.id ?? null,
      currentPeriodStart: new Date((firstItem?.current_period_start ?? sub.billing_cycle_anchor) * 1000),
      currentPeriodEnd: new Date((firstItem?.current_period_end ?? sub.billing_cycle_anchor) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      plan: 'pro',
      status: sub.status,
      stripePriceId: firstItem?.price?.id ?? null,
      currentPeriodStart: new Date((firstItem?.current_period_start ?? sub.billing_cycle_anchor) * 1000),
      currentPeriodEnd: new Date((firstItem?.current_period_end ?? sub.billing_cycle_anchor) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelledAt: null,
    },
  });

  return user;
}

async function cancelSubscription(stripeSubscriptionId: string) {
  const prisma = getPrismaClient();

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });

  if (!subscription) return null;

  await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: {
      status: 'canceled',
      plan: 'free',
      cancelledAt: new Date(),
      cancelAtPeriodEnd: false,
    },
  });

  return prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { id: true, email: true },
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logError('BILLING', err, { area: 'webhook_signature' });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  logInfo('BILLING', 'webhook_received', { type: event.type });

  try {
    switch (event.type) {

      // ── Checkout completed: link customer → user, then activate subscription ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Save stripeCustomerId on the user immediately
        if (session.customer && session.customer_email) {
          const prisma = getPrismaClient();
          await prisma.user.updateMany({
            where: { email: session.customer_email },
            data: { stripeCustomerId: session.customer as string },
          });
        }

        // If there's a subscription attached, activate it now.
        // This handles the race where customer.subscription.created fired first
        // but couldn't find the user yet because stripeCustomerId wasn't saved.
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const user = await upgradeToPro(sub, session.customer_email);
          if (user) {
            notifyAdmin(
              buildAdminAlert({ tipo: 'new_user', userId: user.id }) +
              `\n💳 *Nueva suscripción Pro*\nEmail: \`${user.email}\``
            );
            logInfo('BILLING', 'subscription_activated', {
              userId: user.id,
              subscriptionId: sub.id,
              status: sub.status,
            });
          }
        }
        break;
      }

      // ── Subscription updates (renewals, plan changes, trial → active) ─────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;

        // Fetch customer email for the fallback lookup
        let email: string | null = null;
        try {
          const customer = await stripe.customers.retrieve(sub.customer as string);
          if (!customer.deleted) email = customer.email;
        } catch { /* non-critical */ }

        const user = await upgradeToPro(sub, email);

        if (user && event.type === 'customer.subscription.created') {
          logInfo('BILLING', 'subscription_created', {
            userId: user.id,
            subscriptionId: sub.id,
            status: sub.status,
          });
        }
        break;
      }

      // ── Cancellation ──────────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const user = await cancelSubscription(sub.id);
        if (user) {
          logInfo('BILLING', 'subscription_cancelled', { userId: user.id, subscriptionId: sub.id });
          notifyAdmin(`❌ *Suscripción cancelada*\nUsuario: \`${user.id}\`\nEmail: \`${user.email}\``);
        }
        break;
      }

      // ── Payment events ────────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logWarn('BILLING', 'payment_failed', {
          customerId: invoice.customer,
          email: invoice.customer_email,
        });
        notifyAdmin(`⚠️ *Pago fallido*\nEmail: \`${invoice.customer_email ?? 'desconocido'}\`\nCliente: \`${invoice.customer}\``);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logInfo('BILLING', 'payment_succeeded', {
          customerId: invoice.customer,
          amount: invoice.amount_paid,
        });
        break;
      }
    }
  } catch (err) {
    logError('BILLING', err, { eventType: event.type });
    // Return 200 so Stripe doesn't retry — the error is logged
  }

  return NextResponse.json({ received: true });
}
