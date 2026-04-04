import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, syncSubscription } from "@/services/billing";
import { logError, logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Stripe requires the raw body — disable body parsing
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    logWarn("BILLING", "STRIPE_WEBHOOK_SECRET not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    const rawBody = await req.text();
    event = constructWebhookEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logError("BILLING", err, { route: "webhook", area: "signature_verification" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  logInfo("BILLING", "webhook_received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await syncSubscription(subscription);
        break;
      }

      case "checkout.session.completed": {
        // subscription is handled via customer.subscription.created
        // nothing extra needed here unless you want to track one-time payments
        logInfo("BILLING", "checkout_completed", {
          sessionId: (event.data.object as { id: string }).id,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as { customer: string; subscription: string };
        logWarn("BILLING", "invoice_payment_failed", {
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
        });
        // Stripe will retry and eventually cancel — subscription.updated handles status change
        break;
      }

      default:
        // Unhandled event — ok
        break;
    }
  } catch (err) {
    logError("BILLING", err, { route: "webhook", eventType: event.type });
    // Return 200 so Stripe doesn't retry — log the error for manual investigation
  }

  return NextResponse.json({ received: true });
}
