import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOnboardingSession, updateOnboardingSession, getUserBIO } from '@/lib/dynamodb';
import { updateBIOFromSelections, shouldStopOnboarding } from '@/lib/bio-generator';
import { getPlacesDetails } from '@/lib/google-places';
import { PlaceCategory } from '@/types';

/**
 * POST /api/onboarding/submit-answer
 * Submit answer to onboarding question and update BIO
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { 
      questionType, 
      selectedPlaceIds, 
      comparisonData,
      skipCategory,
      sliderValue // For A/B comparison from frontend
    } = body as {
      questionType?: 'multi-select' | 'ab-comparison';
      selectedPlaceIds?: string[];
      comparisonData?: {
        placeAId: string;
        placeBId: string;
        sliderValue: number;
      };
      skipCategory?: boolean;
      sliderValue?: number;
    };

    // Get onboarding session
    const session = await getOnboardingSession(user.userId);
    if (!session) {
      return NextResponse.json(
        { error: 'Onboarding session not found' },
        { status: 404 }
      );
    }

    const category = session.currentCategory;
    if (!category) {
      return NextResponse.json(
        { error: 'No current category in session' },
        { status: 400 }
      );
    }

    // Verify BIO exists (should have been initialized during category selection)
    const bio = await getUserBIO(user.userId);
    if (!bio) {
      return NextResponse.json(
        { error: 'User BIO not found. Please complete category selection first.' },
        { status: 400 }
      );
    }

    // Handle skip category
    if (skipCategory) {
      // Move to next category or complete
      const currentCategoryIndex = session.selectedCategories?.indexOf(category as PlaceCategory) ?? -1;
      const hasMoreCategories =
        session.selectedCategories &&
        currentCategoryIndex < session.selectedCategories.length - 1;

      if (hasMoreCategories) {
        const nextCategory = session.selectedCategories![currentCategoryIndex + 1];
        await updateOnboardingSession(user.userId, {
          currentCategory: nextCategory,
          questionsAsked: 0,
        });
        return NextResponse.json({
          success: true,
          categoryComplete: true,
          nextCategory,
        });
      } else {
        // Onboarding complete
        await updateOnboardingSession(user.userId, {
          currentStep: 'complete',
          completed: true,
        });
        return NextResponse.json({
          success: true,
          onboardingComplete: true,
        });
      }
    }

    // Infer questionType if not provided
    const inferredQuestionType = questionType || 
      (sliderValue !== undefined ? 'ab-comparison' : 'multi-select');

    // Update BIO based on answer
    let bioUpdateResult;

    if (inferredQuestionType === 'multi-select') {
      if (!selectedPlaceIds || selectedPlaceIds.length === 0) {
        return NextResponse.json(
          { error: 'No places selected' },
          { status: 400 }
        );
      }

      // Fetch place details (from cache if available)
      const places = await getPlacesDetails(selectedPlaceIds, undefined, 30);

      if (places.length === 0) {
        return NextResponse.json(
          { error: 'Failed to fetch place details. Please try again.' },
          { status: 500 }
        );
      }

      // Update BIO
      bioUpdateResult = await updateBIOFromSelections({
        userId: user.userId,
        category,
        selections: places.map((place) => ({
          place,
          selected: true,
        })),
      });
    } else if (inferredQuestionType === 'ab-comparison') {
      // Handle both formats: comparisonData object or separate sliderValue + selectedPlaceIds
      let placeAId: string;
      let placeBId: string;
      let comparisonSliderValue: number;

      if (comparisonData) {
        placeAId = comparisonData.placeAId;
        placeBId = comparisonData.placeBId;
        comparisonSliderValue = comparisonData.sliderValue;
      } else if (sliderValue !== undefined && selectedPlaceIds && selectedPlaceIds.length === 2) {
        placeAId = selectedPlaceIds[0];
        placeBId = selectedPlaceIds[1];
        comparisonSliderValue = sliderValue;
      } else {
        return NextResponse.json(
          { error: 'Comparison data required for A/B question. Need sliderValue and 2 place IDs.' },
          { status: 400 }
        );
      }

      // Fetch both places
      const [placeA, placeB] = await getPlacesDetails(
        [placeAId, placeBId],
        undefined,
        30
      );

      if (!placeA || !placeB) {
        return NextResponse.json(
          { error: 'Failed to fetch place details' },
          { status: 500 }
        );
      }

      // Update BIO
      bioUpdateResult = await updateBIOFromSelections({
        userId: user.userId,
        category,
        comparison: {
          placeA,
          placeB,
          sliderValue: comparisonSliderValue,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }

    // Increment questions asked
    const newQuestionsAsked = session.questionsAsked + 1;

    // Check if we should stop onboarding for this category
    const shouldStop = shouldStopOnboarding(
      bioUpdateResult.confidenceScore,
      newQuestionsAsked,
      [] // TODO: Track variance history
    );

    // Update session
    await updateOnboardingSession(user.userId, {
      questionsAsked: newQuestionsAsked,
    });

    // Prepare response
    const response: any = {
      success: true,
      confidenceScore: bioUpdateResult.confidenceScore,
      questionsAsked: newQuestionsAsked,
      shouldContinue: !shouldStop,
    };

    if (!shouldStop && bioUpdateResult.nextStrategy) {
      // Continue with next question
      response.nextQuestionType = bioUpdateResult.nextStrategy.questionType;
      response.nextQueries = bioUpdateResult.nextStrategy.queries;
      response.nextMessage = bioUpdateResult.nextStrategy.message;
      response.reasoning = bioUpdateResult.nextStrategy.reasoning;
    } else {
      // Move to next category or complete
      const currentCategoryIndex = session.selectedCategories?.indexOf(category as PlaceCategory) ?? -1;
      const hasMoreCategories =
        session.selectedCategories &&
        currentCategoryIndex < session.selectedCategories.length - 1;

      if (hasMoreCategories) {
        const nextCategory = session.selectedCategories![currentCategoryIndex + 1];
        await updateOnboardingSession(user.userId, {
          currentCategory: nextCategory,
          questionsAsked: 0,
        });
        response.categoryComplete = true;
        response.nextCategory = nextCategory;
      } else {
        // Onboarding complete
        await updateOnboardingSession(user.userId, {
          currentStep: 'complete',
          completed: true,
        });
        response.onboardingComplete = true;
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to submit answer', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
