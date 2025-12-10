import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOnboardingSession } from '@/lib/dynamodb';

/**
 * GET /api/onboarding/session
 * Get current onboarding session state
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const session = await getOnboardingSession(user.userId);

    if (!session) {
      return NextResponse.json(
        { error: 'No onboarding session found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        currentStep: session.currentStep,
        currentCategory: session.currentCategory,
        questionsAsked: session.questionsAsked,
        completed: session.completed,
        selectedCategories: session.selectedCategories,
        lastActive: session.lastActive,
      },
    });
  } catch (error: any) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Failed to get session', details: error.message },
      { status: 500 }
    );
  }
}
