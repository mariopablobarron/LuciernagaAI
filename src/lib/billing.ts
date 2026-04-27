// Pricing constants used by both the Telegram revenue summary and the
// /api/admin/monetization endpoint. Single source of truth so MRR cannot
// diverge between channels.
//
// Numbers are USD-denominated approximations; for real per-customer revenue
// use Stripe invoices. The mapping resolves a Stripe price ID to a monthly
// equivalent (annual plans are spread over 12 months).

const PRICE_MONTHLY_MRR_USD = 9.99;
const PRICE_ANNUAL_MRR_USD = 99.99 / 12;

export function pricePointsToMrr(stripePriceId: string | null): number {
  if (!stripePriceId) return PRICE_MONTHLY_MRR_USD;
  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const annual = process.env.STRIPE_PRICE_PRO_ANNUAL?.trim();
  if (annual && stripePriceId === annual) return PRICE_ANNUAL_MRR_USD;
  if (monthly && stripePriceId === monthly) return PRICE_MONTHLY_MRR_USD;
  return PRICE_MONTHLY_MRR_USD;
}

export const BILLING_CONSTANTS = {
  PRICE_MONTHLY_MRR_USD,
  PRICE_ANNUAL_MRR_USD,
} as const;
