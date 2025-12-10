import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { cancelSubscription } from '@/lib/paddle';

/**
 * POST /api/subscription/cancel
 * Cancel user's subscription (effective at period end)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    await cancelSubscription(user.userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: error.message },
      { status: 500 }
    );
  }
}
