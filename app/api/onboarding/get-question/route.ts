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
    const { questionType, queries, message: providedMessage, excludePlaceIds } = body as {
      questionType?: 'multi-select' | 'ab-comparison';
      queries?: string[];
      message?: string;
      excludePlaceIds?: string[];
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
    const requiredCount = actualQuestionType === 'ab-comparison' ? 2 : 4; // Define at top level for use throughout
    let message: string | undefined = undefined; // Initialize message variable

    // Helper function to fetch places with photos, retrying if needed
    const fetchPlacesWithPhotos = async (
      fetchFn: (maxCount: number) => Promise<any[]>,
      excludeIds: string[] = [],
      targetCount: number = requiredCount
    ): Promise<any[]> => {
      let allPlaces: any[] = [];
      const excludedCount = excludeIds.length;
      const seenIds = new Set<string>(excludeIds);
      const maxAttempts = 3; // Limit attempts
      let attempts = 0;
      const fetchCount = 20; // Always fetch max (costs the same as fetching fewer)

      console.log(`[get-question] Starting fetch: target=${targetCount}, excluded=${excludedCount}, fetching max=${fetchCount}`);

      while (allPlaces.length < targetCount && attempts < maxAttempts) {
        attempts++;
        console.log(`[get-question] Fetch attempt ${attempts}: requesting ${fetchCount} places`);
        
        const fetchedPlaces = await fetchFn(fetchCount);
        
        // Filter out excluded places and places without photos
        const validPlaces = fetchedPlaces.filter(place => {
          if (!place || seenIds.has(place.id)) return false;
          return place.photos && Array.isArray(place.photos) && place.photos.length > 0;
        });

        // Add to our collection (API already returns sorted by POPULARITY)
        validPlaces.forEach(place => {
          if (!seenIds.has(place.id)) {
            allPlaces.push(place);
            seenIds.add(place.id);
          }
        });

        console.log(`[get-question] Attempt ${attempts}: fetched ${fetchedPlaces.length}, valid with photos: ${validPlaces.length}, total collected: ${allPlaces.length}, excluded: ${excludedCount}`);

        // If we still don't have enough, we'll try again (with expanded radius if applicable)
        if (allPlaces.length < targetCount && attempts < maxAttempts) {
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (allPlaces.length < targetCount) {
        console.warn(`[get-question] Only found ${allPlaces.length} places with photos after ${attempts} attempts, needed ${targetCount}. Excluded ${excludedCount} places.`);
      }

      return allPlaces.slice(0, targetCount);
    };

    if (questionNumber === 1 && !excludePlaceIds) {
      // First question: Show popular places from category
      // Fetch exactly 4, retrying if needed to ensure all have photos
      places = await fetchPlacesWithPhotos(
        (maxCount) => searchNearby({
          latitude: location.lat,
          longitude: location.lng,
          radius: 5000,
          includedTypes: [category],
          maxResultCount: maxCount,
          rankPreference: 'POPULARITY',
          fieldMask: ONBOARDING_FIELDS,
        }),
        [],
        4
      );
      
      // Get primary type from first place for future searches
      const primaryType = places.length > 0 && places[0].primaryType ? places[0].primaryType : category;
      
      messageType = 'question_intro';
      actualQuestionType = 'multi-select';
      
      // Try to get message from DynamoDB first
      if (places.length > 0) {
        const categoryInfo = await import('@/lib/categories').then(m => m.getCategoryInfo(category));
        const typeName = categoryInfo?.name || category.replace('_', ' ');
        const messageData = await getOnboardingMessage(messageType);
        if (messageData?.text) {
          message = messageData.text
            .replace('{category}', typeName.toLowerCase())
            .replace('{city}', userProfile.residentialPlace || 'your area');
        } else {
          // Fallback to dynamic message if DynamoDB lookup fails
          message = `Which of these ${typeName.toLowerCase()} spots in ${userProfile.residentialPlace || 'your area'} catch your eye?`;
        }
      }
    } else if (queries && queries.length > 0) {
      // AI-driven question with custom queries
      // Get primary type from category's googleTypes (first one) or use category itself
      const categoryInfo = await import('@/lib/categories').then(m => m.getCategoryInfo(category));
      const primaryType = categoryInfo?.googleTypes?.[0] || category;
      
      // Fetch exactly what we need per query, retrying if needed
      const placesPerQuery = Math.ceil(requiredCount / queries.length);
      const queryResults = await Promise.all(
        queries.map((query) =>
          fetchPlacesWithPhotos(
            (maxCount) => searchText({
              textQuery: `${query} ${category} ${userProfile.residentialPlace}`,
              locationBias: {
                latitude: location.lat,
                longitude: location.lng,
                radius: 5000,
              },
              includedType: primaryType,
              maxResultCount: maxCount,
              fieldMask: ONBOARDING_FIELDS,
              strictTypeFiltering: true,
            }),
            [],
            placesPerQuery
          )
        )
      );

      // Flatten and deduplicate results
      const allPlaces = queryResults.flat();
      const uniquePlaces = Array.from(
        new Map(allPlaces.map((place) => [place.id, place])).values()
      );
      places = uniquePlaces.slice(0, requiredCount);

      // Choose message type based on question number
      if (questionNumber > 7) {
        messageType = 'nearing_completion';
      } else if (actualQuestionType === 'ab-comparison') {
        messageType = 'comparison_intro';
      } else {
        messageType = Math.random() > 0.5 ? 'continue_exploring' : 'style_contrast';
      }
    } else {
      // Fallback: Get different places from category
      // Get primary type from category's googleTypes (first one) or use category itself
      const categoryInfo = await import('@/lib/categories').then(m => m.getCategoryInfo(category));
      const primaryType = categoryInfo?.googleTypes?.[0] || category;
      
      // Start with 5000m radius, double it if we get 0 results (max 50000m)
      let radius = 5000;
      let placesFound = 0;
      const maxRadiusAttempts = 5; // Prevent infinite expansion
      const MAX_RADIUS = 50000; // Google Places API maximum
      let radiusAttempts = 0;
      
      while (placesFound < requiredCount && radiusAttempts < maxRadiusAttempts) {
        radiusAttempts++;
        console.log(`[get-question] Trying radius ${radius}m (attempt ${radiusAttempts})`);
        
        places = await fetchPlacesWithPhotos(
          (maxCount) => searchNearby({
            latitude: location.lat,
            longitude: location.lng,
            radius: radius,
            includedTypes: [primaryType], // Use primaryType instead of category
            maxResultCount: maxCount,
            rankPreference: 'POPULARITY',
            fieldMask: ONBOARDING_FIELDS,
          }),
          excludePlaceIds || [],
          requiredCount
        );
        
        placesFound = places.length;
        
        // If we got 0 results, double the radius and try again (but cap at max)
        if (placesFound === 0 && radiusAttempts < maxRadiusAttempts && radius < MAX_RADIUS) {
          radius = Math.min(radius * 2, MAX_RADIUS);
          console.log(`[get-question] Got 0 results, doubling radius to ${radius}m`);
        } else {
          break; // We got results, hit max attempts, or reached max radius
        }
      }
      
      if (placesFound === 0) {
        console.warn(`[get-question] No places found even with radius ${radius}m. Excluded ${excludePlaceIds?.length || 0} places.`);
      }
      
      messageType = 'continue_exploring';
    }

    // Get message: use provided message from BIO update if available, otherwise generate dynamic message
    if (!message && providedMessage) {
      message = providedMessage;
    }
    
    if (!message) {
      // Generate dynamic message addressing the type
      const categoryInfo = await import('@/lib/categories').then(m => m.getCategoryInfo(category));
      const typeName = categoryInfo?.name || category.replace('_', ' ');
      
      // Fallback to DynamoDB messages if available, otherwise use dynamic message
      const messageData = await getOnboardingMessage(messageType);
      if (messageData?.text) {
        message = messageData.text
          .replace('{category}', typeName.toLowerCase())
          .replace('{city}', userProfile.residentialPlace || 'your area');
      } else {
        // More varied fallback messages based on messageType
        const fallbackMessages: Record<string, string> = {
          'question_intro': `Which of these ${typeName.toLowerCase()} spots in ${userProfile.residentialPlace || 'your area'} catch your eye?`,
          'continue_exploring': `Let's keep going - here are some more ${typeName.toLowerCase()} options`,
          'style_contrast': `Here's a different style of ${typeName.toLowerCase()} - what do you think?`,
          'comparison_intro': `Compare these two ${typeName.toLowerCase()} options`,
          'nearing_completion': `Almost done! Here are some final ${typeName.toLowerCase()} options`,
        };
        message = fallbackMessages[messageType] || `Which of these ${typeName.toLowerCase()} spots in ${userProfile.residentialPlace || 'your area'} catch your eye?`;
      }
    }

    // Log photo data for debugging
    console.log(`[get-question] Places before filtering: ${places.length}`);
    places.forEach((place, idx) => {
      try {
        const hasPhotos = place?.photos && Array.isArray(place.photos) && place.photos.length > 0;
        const photosType = place?.photos ? typeof place.photos : 'undefined';
        const photosLength = place?.photos ? place.photos.length : 0;
        const displayName = place?.displayName || 'Unknown';
        console.log(`[get-question] Place ${idx}: ${displayName}, hasPhotos: ${hasPhotos}, photosType: ${photosType}, photosLength: ${photosLength}`);
      } catch (err) {
        console.error(`[get-question] Error logging place ${idx}:`, err);
      }
    });
    
    // Filter places to only include those with photos
    const placesWithPhotos = places.filter(place => {
      if (!place) return false;
      const hasPhotos = place.photos && Array.isArray(place.photos) && place.photos.length > 0;
      if (!hasPhotos) {
        const displayName = place.displayName || 'Unknown';
        const placeId = place.id || 'unknown';
        console.log(`[get-question] Filtering out place without photos: ${displayName} (id: ${placeId}), photos:`, place.photos);
      }
      return hasPhotos;
    });
    
    // Log places without photos for debugging
    const placesWithoutPhotos = places.filter(place => !place || !place.photos || !Array.isArray(place.photos) || place.photos.length === 0);
    if (placesWithoutPhotos.length > 0) {
      console.log(`[get-question] Filtered out ${placesWithoutPhotos.length} places without photos:`, 
        placesWithoutPhotos.map(p => ({ id: p?.id || 'unknown', name: p?.displayName || 'Unknown', photos: p?.photos })));
    }
    
    // Check if we have enough places with photos
    console.log(`[get-question] Places with photos: ${placesWithPhotos.length}, required: ${requiredCount}`);
    if (placesWithPhotos.length < requiredCount) {
      console.warn(`[get-question] Only found ${placesWithPhotos.length} places with photos, need ${requiredCount}. Total places fetched: ${places.length}`);
    }

    // Transform places to OnboardingPlaceCard format (only those with photos)
    const placeCards: OnboardingPlaceCard[] = placesWithPhotos.slice(0, requiredCount).map((place) => {
      if (!place) {
        throw new Error('Place is null or undefined');
      }
      const photos = (place.photos || []).slice(0, 4);
      const displayName = place.displayName || 'Unknown';
      console.log(`[get-question] Transforming place: ${displayName}, photos count: ${photos.length}, photos:`, photos);
      return {
        placeId: place.id || '',
        name: displayName,
        address: place.formattedAddress || '',
        rating: place.rating || 0,
        photos: photos,
        description: place.reviews?.[0]?.text || undefined,
        reviews: (place.reviews || []).slice(0, 3).map((review: any) => ({
          text: review.text?.text || review.text || '',
          rating: review.rating || 0,
          authorName: review.authorAttribution?.displayName || 'Anonymous',
        })),
        types: place.types || [],
        priceLevel: place.priceLevel,
        regularOpeningHours: place.regularOpeningHours,
      };
    });
    
    // Final check - log placeCards photos and filter out any without photos (safety check)
    console.log(`[get-question] Final placeCards before safety filter:`, placeCards.map(pc => ({ 
      name: pc.name, 
      photosCount: pc.photos?.length || 0,
      hasPhotos: (pc.photos && pc.photos.length > 0)
    })));
    
    // Final safety filter - ensure all placeCards have photos
    const finalPlaceCards = placeCards.filter(pc => pc.photos && Array.isArray(pc.photos) && pc.photos.length > 0);
    
    if (finalPlaceCards.length < placeCards.length) {
      console.warn(`[get-question] Safety filter removed ${placeCards.length - finalPlaceCards.length} placeCards without photos`);
    }
    
    if (finalPlaceCards.length < requiredCount) {
      console.warn(`[get-question] Only ${finalPlaceCards.length} placeCards with photos after filtering, need ${requiredCount}`);
    }

    return NextResponse.json({
      success: true,
      questionType: actualQuestionType,
      questionNumber,
      message,
      places: finalPlaceCards,
      category,
    });
  } catch (error: any) {
    console.error('Error getting question:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
    });
    return NextResponse.json(
      { error: 'Failed to get question', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
