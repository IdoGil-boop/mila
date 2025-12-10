import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createPaddleCheckout } from '@/lib/paddle';

/**
 * POST /api/subscription/create-checkout
 * Create a Paddle checkout session for subscription
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { tier } = body as { tier: 'premium' | 'pay_as_you_go' };

    if (!tier || (tier !== 'premium' && tier !== 'pay_as_you_go')) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "premium" or "pay_as_you_go"' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Paddle checkout
    const checkout = await createPaddleCheckout({
      userId: user.userId,
      email: user.email,
      tier,
      successUrl: `${appUrl}/subscription/success`,
      cancelUrl: `${appUrl}/subscription/cancel`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.checkoutUrl,
      checkoutId: checkout.checkoutId,
    });
  } catch (error: any) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout', details: error.message },
      { status: 500 }
    );
  }
}
