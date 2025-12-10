import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateOnboardingSession, getOnboardingSession } from '@/lib/dynamodb';
import { initializeBIO } from '@/lib/bio-generator';
import { PlaceCategory } from '@/types';

/**
 * POST /api/onboarding/select-categories
 * Save user's selected categories and initialize BIO
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { categories } = body as { categories: PlaceCategory[] };

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one category' },
        { status: 400 }
      );
    }

    // Get onboarding session
    const session = await getOnboardingSession(user.userId);
    if (!session) {
      return NextResponse.json(
        { error: 'Onboarding session not found. Please start onboarding first.' },
        { status: 404 }
      );
    }

    // Initialize BIO with selected categories
    await initializeBIO(user.userId, categories);

    // Update onboarding session
    await updateOnboardingSession(user.userId, {
      currentStep: 'discover',
      currentCategory: categories[0],
      selectedCategories: categories,
    });

    return NextResponse.json({
      success: true,
      message: 'Categories saved successfully',
      nextCategory: categories[0],
    });
  } catch (error: any) {
    console.error('Error saving categories:', error);
    return NextResponse.json(
      { error: 'Failed to save categories', details: error.message },
      { status: 500 }
    );
  }
}
