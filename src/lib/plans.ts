export type Plan = 'free' | 'pro';

export const PLANS = {
  free: {
    name: 'Gratis',
    price: 0,
    limits: {
      conversationsPerMonth: Infinity,
      messagesPerConversation: Infinity,
      impulsoEnabled: false,
      diagnosticoEnabled: true,
    },
  },
  pro: {
    name: 'Pro',
    price: 9,
    currency: '€',
    interval: 'mes',
    limits: {
      conversationsPerMonth: Infinity,
      messagesPerConversation: Infinity,
      impulsoEnabled: true,
      diagnosticoEnabled: true,
    },
  },
} as const;

// Conservado por compatibilidad con call sites antiguos. Ya no se muestra
// porque el chat es ilimitado en free; Pro se diferencia por extras.
export const FREE_LIMIT_MESSAGE = '';

/** Stripe price IDs — set these env vars in Coolify */
export function getStripePriceId(plan: 'pro_monthly' | 'pro_annual'): string {
  const key = plan === 'pro_monthly'
    ? 'STRIPE_PRICE_PRO_MONTHLY'
    : 'STRIPE_PRICE_PRO_ANNUAL';
  const id = process.env[key]?.trim();
  if (!id) throw new Error(`[Plans] Missing env var: ${key}`);
  return id;
}

export const STRIPE_TRIAL_DAYS = 7;
