import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("[Stripe] STRIPE_SECRET_KEY is not set");
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: "2025-03-31.basil",
    typescript: true,
  });

  return _stripe;
}

/** Returns null instead of throwing — use in optional Stripe paths */
export function getStripeOptional(): Stripe | null {
  try {
    return getStripe();
  } catch {
    return null;
  }
}
