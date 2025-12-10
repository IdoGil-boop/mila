import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOnboardingSession, updateOnboardingSession } from '@/lib/dynamodb';
import { updateBIOFromSelections, shouldStopOnboarding } from '@/lib/bio-generator';
import { getPlacesDetails, ONBOARDING_FIELDS } from '@/lib/google-places';
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
    const { questionType, selectedPlaceIds, comparisonData } = body as {
      questionType: 'multi-select' | 'ab-comparison';
      selectedPlaceIds?: string[];
      comparisonData?: {
        placeAId: string;
        placeBId: string;
        sliderValue: number;
      };
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

    // Update BIO based on answer
    let bioUpdateResult;

    if (questionType === 'multi-select') {
      if (!selectedPlaceIds || selectedPlaceIds.length === 0) {
        return NextResponse.json(
          { error: 'No places selected' },
          { status: 400 }
        );
      }

      // Fetch place details (from cache if available)
      const places = await getPlacesDetails(selectedPlaceIds, ONBOARDING_FIELDS, 30);

      // Update BIO
      bioUpdateResult = await updateBIOFromSelections({
        userId: user.userId,
        category,
        selections: places.map((place) => ({
          place,
          selected: true,
        })),
      });
    } else if (questionType === 'ab-comparison') {
      if (!comparisonData) {
        return NextResponse.json(
          { error: 'Comparison data required for A/B question' },
          { status: 400 }
        );
      }

      // Fetch both places
      const [placeA, placeB] = await getPlacesDetails(
        [comparisonData.placeAId, comparisonData.placeBId],
        ONBOARDING_FIELDS,
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
          sliderValue: comparisonData.sliderValue,
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
    return NextResponse.json(
      { error: 'Failed to submit answer', details: error.message },
      { status: 500 }
    );
  }
}
