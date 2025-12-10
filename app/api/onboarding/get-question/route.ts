import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOnboardingSession, getUserBIO, getUser, getOnboardingMessage } from '@/lib/dynamodb';
import { searchNearby, searchText, getPlaceLocation, ONBOARDING_FIELDS } from '@/lib/google-places';
import { PlaceCategory, OnboardingPlaceCard } from '@/types';

/**
 * POST /api/onboarding/get-question
 * Get the next question for onboarding (multi-select or A/B comparison)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { questionType, queries, message: providedMessage } = body as {
      questionType?: 'multi-select' | 'ab-comparison';
      queries?: string[];
      message?: string;
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

    // Get user profile for residential place
    const userProfile = await getUser(user.userId);
    if (!userProfile || !userProfile.residentialPlaceId) {
      return NextResponse.json(
        { error: 'Residential place not set. Please complete account setup.' },
        { status: 400 }
      );
    }

    // Get location of residential place
    const location = await getPlaceLocation(userProfile.residentialPlaceId);
    if (!location) {
      return NextResponse.json(
        { error: 'Could not determine residential location' },
        { status: 500 }
      );
    }

    // Get current BIO
    const bio = await getUserBIO(user.userId);
    const questionNumber = session.questionsAsked + 1;

    let places: any[] = [];
    let messageType = 'question_intro';
    let actualQuestionType: 'multi-select' | 'ab-comparison' = questionType || 'multi-select';

    if (questionNumber === 1) {
      // First question: Show popular places from category
      places = await searchNearby({
        latitude: location.lat,
        longitude: location.lng,
        radius: 5000,
        includedTypes: [category],
        maxResultCount: 4,
        rankPreference: 'POPULARITY',
        fieldMask: ONBOARDING_FIELDS,
      });
      messageType = 'question_intro';
      actualQuestionType = 'multi-select';
    } else if (queries && queries.length > 0) {
      // AI-driven question with custom queries
      const queryResults = await Promise.all(
        queries.map((query) =>
          searchText({
            textQuery: `${query} ${category} ${userProfile.residentialPlace}`,
            locationBias: {
              latitude: location.lat,
              longitude: location.lng,
              radius: 5000,
            },
            maxResultCount: actualQuestionType === 'ab-comparison' ? 1 : 2,
            fieldMask: ONBOARDING_FIELDS,
          })
        )
      );

      // Flatten and mix results
      places = queryResults.flat().slice(0, actualQuestionType === 'ab-comparison' ? 2 : 4);

      // Choose message type based on question number
      if (questionNumber > 7) {
        messageType = 'nearing_completion';
      } else if (actualQuestionType === 'ab-comparison') {
        messageType = 'comparison_intro';
      } else {
        messageType = Math.random() > 0.5 ? 'continue_exploring' : 'style_contrast';
      }
    } else {
      // Fallback: Random places from category
      places = await searchNearby({
        latitude: location.lat,
        longitude: location.lng,
        radius: 5000,
        includedTypes: [category],
        maxResultCount: actualQuestionType === 'ab-comparison' ? 2 : 4,
        rankPreference: 'POPULARITY',
        fieldMask: ONBOARDING_FIELDS,
      });
      messageType = 'continue_exploring';
    }

    // Get message: use provided message from BIO update if available, otherwise fallback to DynamoDB
    let message = providedMessage;
    
    if (!message) {
      // Fallback to DynamoDB messages
      const messageData = await getOnboardingMessage(messageType);
      message = messageData?.text || 'What do you think about these places?';
      
      // Replace variables (for fallback messages that might still have placeholders)
      message = message
        .replace('{category}', category)
        .replace('{city}', userProfile.residentialPlace || 'your area');
    }

    // Transform places to OnboardingPlaceCard format
    const placeCards: OnboardingPlaceCard[] = places.map((place) => ({
      placeId: place.id,
      name: place.displayName,
      address: place.formattedAddress || '',
      rating: place.rating || 0,
      photos: (place.photos || []).slice(0, 4),
      description: place.reviews?.[0]?.text || undefined,
      reviews: place.reviews?.slice(0, 3).map((review: any) => ({
        text: review.text?.text || review.text || '',
        rating: review.rating || 0,
        authorName: review.authorAttribution?.displayName || 'Anonymous',
      })),
      types: place.types || [],
      priceLevel: place.priceLevel,
      regularOpeningHours: place.regularOpeningHours,
    }));

    return NextResponse.json({
      success: true,
      questionType: actualQuestionType,
      questionNumber,
      message,
      places: placeCards,
      category,
    });
  } catch (error: any) {
    console.error('Error getting question:', error);
    return NextResponse.json(
      { error: 'Failed to get question', details: error.message },
      { status: 500 }
    );
  }
}
