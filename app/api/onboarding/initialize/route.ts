import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createOnboardingSession, getUser, getUserBIO } from '@/lib/dynamodb';
import { PlaceCategory } from '@/types';

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
    const body = await request.json().catch(() => ({}));
    const { category } = body as { category?: PlaceCategory };

    // Check if user has residential place set
    const userProfile = await getUser(user.userId);
    const hasResidentialPlace = userProfile?.residentialPlaceId;

    // If a specific category is provided, start onboarding for that category
    if (category) {
      // Get existing BIO to get selected categories
      const bio = await getUserBIO(user.userId);
      const selectedCategories = bio?.categories 
        ? Object.keys(bio.categories) as PlaceCategory[]
        : [category];

      // Ensure the requested category is in the list
      if (!selectedCategories.includes(category)) {
        selectedCategories.push(category);
      }

      // Create onboarding session starting with the requested category
      await createOnboardingSession({
        userId: user.userId,
        currentStep: hasResidentialPlace ? 'discover' : 'location',
        currentCategory: category,
        questionsAsked: 0,
        completed: false,
        selectedCategories,
      });

      return NextResponse.json({
        success: true,
        message: 'Onboarding session initialized for category',
        category,
        requiresLocation: !hasResidentialPlace,
      });
    }

    // Create onboarding session
    // If no residential place, the frontend will show location step first
    await createOnboardingSession({
      userId: user.userId,
      currentStep: hasResidentialPlace ? 'categories' : 'location',
      questionsAsked: 0,
      completed: false,
      selectedCategories: [],
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding session initialized',
      requiresLocation: !hasResidentialPlace,
    });
  } catch (error: any) {
    console.error('Error initializing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to initialize onboarding', details: error.message },
      { status: 500 }
    );
  }
}
