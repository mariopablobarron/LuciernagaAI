import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getPrismaClient } from '@/db/prisma';
import { notifyAdmin, buildAdminAlert } from '@/services/telegram';
import { logError, logInfo, logWarn } from '@/lib/logger';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

async function upgradeToPro(params: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: params.stripeCustomerId },
    select: { id: true, email: true },
  });

  if (!user) {
    logWarn('BILLING', 'webhook_user_not_found', { customerId: params.stripeCustomerId });
    return null;
  }

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: params.stripeSubscriptionId },
    create: {
      userId: user.id,
      plan: 'pro',
      status: params.status,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripeCustomerId: params.stripeCustomerId,
      stripePriceId: params.stripePriceId,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    },
    update: {
      plan: 'pro',
      status: params.status,
      stripePriceId: params.stripePriceId,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
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

  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { id: true, email: true },
  });

  return user;
}

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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer && session.customer_email) {
          const prisma = getPrismaClient();
          await prisma.user.updateMany({
            where: { email: session.customer_email },
            data: { stripeCustomerId: session.customer as string },
          });
        }
        logInfo('BILLING', 'checkout_completed', {
          email: session.customer_email,
          customerId: session.customer,
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const firstItem = sub.items.data[0];
        const user = await upgradeToPro({
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          stripePriceId: firstItem?.price?.id ?? null,
          status: sub.status,
          currentPeriodStart: new Date((firstItem?.current_period_start ?? sub.billing_cycle_anchor) * 1000),
          currentPeriodEnd: new Date((firstItem?.current_period_end ?? sub.billing_cycle_anchor) * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });

        if (user && event.type === 'customer.subscription.created') {
          notifyAdmin(
            buildAdminAlert({ tipo: 'new_user', userId: user.id }) +
            `\n💳 *Nueva suscripción Pro*\nEmail: \`${user.email}\``
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const user = await cancelSubscription(sub.id);
        if (user) {
          logInfo('BILLING', 'subscription_cancelled', { userId: user.id, subscriptionId: sub.id });
          notifyAdmin(`❌ *Suscripción cancelada*\nUsuario: \`${user.id}\`\nEmail: \`${user.email}\``);
        }
        break;
      }

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
