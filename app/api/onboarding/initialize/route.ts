import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createOnboardingSession } from '@/lib/dynamodb';

/**
 * POST /api/onboarding/initialize
 * Initialize onboarding session for a user
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    // Create onboarding session
    await createOnboardingSession({
      userId: user.userId,
      currentStep: 'categories',
      questionsAsked: 0,
      completed: false,
      selectedCategories: [],
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding session initialized',
    });
  } catch (error: any) {
    console.error('Error initializing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to initialize onboarding', details: error.message },
      { status: 500 }
    );
  }
}
