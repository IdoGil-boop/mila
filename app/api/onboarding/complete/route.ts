import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateOnboardingSession, getOnboardingSession } from '@/lib/dynamodb';

/**
 * POST /api/onboarding/complete
 * Mark onboarding as complete
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const session = await getOnboardingSession(user.userId);
    if (!session) {
      return NextResponse.json(
        { error: 'Onboarding session not found' },
        { status: 404 }
      );
    }

    // Mark as complete
    await updateOnboardingSession(user.userId, {
      currentStep: 'complete',
      completed: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding', details: error.message },
      { status: 500 }
    );
  }
}
