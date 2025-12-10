import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserTier, hasPremiumAccess } from '@/lib/paddle';
import { checkRateLimit } from '@/lib/dynamodb';
import { generateSearchContext, generatePlaceExplanation } from '@/lib/bio-generator';
import { searchText, getPlaceLocation, ONBOARDING_FIELDS, PREMIUM_FIELDS } from '@/lib/google-places';
import { PlaceCategory, SearchResult } from '@/types';

/**
 * POST /api/search/personalized
 * Personalized search using user's BIO
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
      destination,
      destinationPlaceId,
      category,
      additionalFilters,
      usePreferences = true,
    } = body as {
      destination: string;
      destinationPlaceId?: string;
      category: PlaceCategory;
      additionalFilters?: Record<string, boolean>;
      usePreferences?: boolean;
    };

    if (!destination || !category) {
      return NextResponse.json(
        { error: 'destination and category are required' },
        { status: 400 }
      );
    }

    // Check user tier and rate limits
    const tier = await getUserTier(user.userId);
    const isPremium = await hasPremiumAccess(user.userId);

    // Rate limiting for free tier
    if (tier === 'free') {
      const rateLimitResult = await checkRateLimit(user.userId, 10, 12);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Free tier allows 10 searches per 12 hours. Upgrade to Premium for unlimited searches.',
            upgradeUrl: '/subscription',
          },
          { status: 429 }
        );
      }
    }

    // Get destination location
    let location: { lat: number; lng: number } | null = null;
    if (destinationPlaceId) {
      location = await getPlaceLocation(destinationPlaceId);
    }

    if (!location) {
      return NextResponse.json(
        { error: 'Could not determine destination location' },
        { status: 400 }
      );
    }

    // Determine field mask based on tier
    const fieldMask = isPremium ? PREMIUM_FIELDS : ONBOARDING_FIELDS;

    let searchQueries: string[] = [];
    let searchContext: any = null;

    if (usePreferences) {
      // Generate personalized search context from BIO
      searchContext = await generateSearchContext(user.userId, category, destination);
      searchQueries = searchContext.searchQueries;
    } else {
      // Generic search without BIO
      searchQueries = [`${category} in ${destination}`];
    }

    // Execute searches
    const searchResults = await Promise.all(
      searchQueries.map((query) =>
        searchText({
          textQuery: query,
          locationBias: {
            latitude: location!.lat,
            longitude: location!.lng,
            radius: 5000,
          },
          includedType: category,
          maxResultCount: 10,
          fieldMask,
        })
      )
    );

    // Flatten and deduplicate results
    const allPlaces = searchResults.flat();
    const uniquePlaces = Array.from(
      new Map(allPlaces.map((place) => [place.id, place])).values()
    );

    // Apply additional filters if provided
    let filteredPlaces = uniquePlaces;
    if (additionalFilters && Object.keys(additionalFilters).length > 0) {
      filteredPlaces = uniquePlaces.filter((place) => {
        return Object.entries(additionalFilters).every(([key, value]) => {
          if (!value) return true; // Skip if filter is false
          return (place as any)[key] === true;
        });
      });
    }

    // Score and sort results based on BIO alignment
    const scoredResults: SearchResult[] = await Promise.all(
      filteredPlaces.slice(0, 20).map(async (place) => {
        // Calculate basic score
        let score = place.rating || 0;

        // Boost score for BIO-aligned keywords
        if (usePreferences && searchContext?.keywords) {
          const placeText = `${place.displayName} ${place.types?.join(' ')} ${place.formattedAddress}`.toLowerCase();
          const matchedKeywords = searchContext.keywords.filter((keyword: string) =>
            placeText.includes(keyword.toLowerCase())
          );
          score += matchedKeywords.length * 0.5;
        }

        // Generate personalized explanation
        const reasoning = usePreferences
          ? await generatePlaceExplanation(user.userId, category, place)
          : undefined;

        return {
          place,
          score,
          reasoning,
          matchedKeywords: usePreferences ? searchContext?.keywords || [] : [],
        };
      })
    );

    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      results: scoredResults,
      totalResults: scoredResults.length,
      tier,
      searchesRemaining: tier === 'free' ? (await checkRateLimit(user.userId, 10, 12)).remaining : null,
      personalized: usePreferences,
    });
  } catch (error: any) {
    console.error('Error performing personalized search:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}
