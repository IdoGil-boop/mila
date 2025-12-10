import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSubscription } from '@/lib/dynamodb';
import { getUserTier } from '@/lib/paddle';

/**
 * GET /api/subscription/status
 * Get user's current subscription status
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const subscription = await getSubscription(user.userId);
    const currentTier = await getUserTier(user.userId);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        tier: 'free',
        subscription: null,
      });
    }

    return NextResponse.json({
      success: true,
      tier: currentTier,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status', details: error.message },
      { status: 500 }
    );
  }
}
