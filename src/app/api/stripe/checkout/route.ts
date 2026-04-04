import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PLANS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { plan = 'pro_monthly', email } = await req.json() as { plan?: string; email?: string };
    const stripePlan = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
    if (!stripePlan) return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      locale: 'es',
      line_items: [{ price: stripePlan.priceId, quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { plan },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios?upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[STRIPE] checkout error:', error);
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 });
  }
}
