import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const STRIPE_PLANS = {
  pro_monthly: {
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    amount: 900,
    currency: 'eur',
    interval: 'month' as const,
    label: '9€/mes',
  },
  pro_annual: {
    priceId: process.env.STRIPE_PRICE_PRO_ANNUAL!,
    amount: 7900,
    currency: 'eur',
    interval: 'year' as const,
    label: '79€/año',
  },
};
