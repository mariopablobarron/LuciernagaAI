import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
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
