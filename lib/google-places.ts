import { PlaceBasicInfo } from '@/types';
import { cachePlace, getCachedPlace } from './dynamodb';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('GOOGLE_PLACES_API_KEY not set. Google Places features will not work.');
}

// Field masks for cost optimization
// For search endpoints (searchNearby, searchText) - use 'places.' prefix
export const ONBOARDING_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.photos',
  'places.reviews',
  'places.priceLevel',
  'places.regularOpeningHours',
].join(',');

// For GET place details endpoint - no 'places.' prefix
export const ONBOARDING_FIELDS_GET = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryType',
  'rating',
  'photos',
  'reviews',
  'priceLevel',
  'regularOpeningHours',
].join(',');

export const PREMIUM_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'places.reviews',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.websiteUri',
  'places.dineIn',
  'places.takeout',
  'places.delivery',
  'places.outdoorSeating',
  'places.servesCoffee',
  'places.allowsDogs',
  'places.goodForGroups',
  'places.servesBreakfast',
  'places.servesBrunch',
  'places.servesLunch',
  'places.servesDinner',
  'places.servesVegetarianFood',
  'places.accessibilityOptions',
].join(',');

interface SearchNearbyParams {
  latitude: number;
  longitude: number;
  radius?: number; // in meters, default 5000
  includedTypes?: string[];
  maxResultCount?: number;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
  fieldMask?: string;
}

interface TextSearchParams {
  textQuery: string;
  locationBias?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  includedType?: string;
  maxResultCount?: number;
  fieldMask?: string;
  strictTypeFiltering?: boolean; // If true, ensures type filtering is applied to all queries, including specific addresses
}

interface PlaceDetailsParams {
  placeId: string;
  fieldMask?: string;
}

/**
 * Transform Google Places API response to our PlaceBasicInfo type
 */
function transformPlace(place: any): PlaceBasicInfo {
  return {
    id: place.id,
    displayName: place.displayName?.text || '',
    formattedAddress: place.formattedAddress,
    location: place.location
      ? {
          lat: place.location.latitude,
          lng: place.location.longitude,
        }
      : undefined,
    types: place.types || [],
    primaryType: place.primaryType,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,
    regularOpeningHours: place.regularOpeningHours
      ? {
          openNow: place.regularOpeningHours.openNow,
          weekdayText: place.regularOpeningHours.weekdayDescriptions,
        }
      : undefined,
    photos: place.photos?.map((photo: any) => {
      const photoName = photo.name;
      return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=800&maxHeightPx=800`;
    }),
    // Premium fields
    websiteUri: place.websiteUri,
    dineIn: place.dineIn,
    takeout: place.takeout,
    delivery: place.delivery,
    outdoorSeating: place.outdoorSeating,
    servesCoffee: place.servesCoffee,
    allowsDogs: place.allowsDogs,
    goodForGroups: place.goodForGroups,
    servesBreakfast: place.servesBreakfast,
    servesBrunch: place.servesBrunch,
    servesLunch: place.servesLunch,
    servesDinner: place.servesDinner,
    servesVegetarianFood: place.servesVegetarianFood,
    accessibilityOptions: place.accessibilityOptions,
  };
}

/**
 * Search for places nearby a location
 * Uses Google Places API (New) - searchNearby endpoint
 */
export async function searchNearby(params: SearchNearbyParams): Promise<PlaceBasicInfo[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  const {
    latitude,
    longitude,
    radius = 5000,
    includedTypes = [],
    maxResultCount = 20,
    rankPreference = 'POPULARITY',
    fieldMask = ONBOARDING_FIELDS,
  } = params;

  const body: any = {
    locationRestriction: {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius,
      },
    },
    includedTypes: includedTypes.length > 0 ? includedTypes : undefined,
    maxResultCount,
    rankPreference,
  };

  try {
    const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map(transformPlace);
  } catch (error) {
    console.error('Error searching nearby places:', error);
    throw error;
  }
}

/**
 * Search for places by text query
 * Uses Google Places API (New) - searchText endpoint
 */
export async function searchText(params: TextSearchParams): Promise<PlaceBasicInfo[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  const {
    textQuery,
    locationBias,
    includedType,
    maxResultCount = 20,
    fieldMask = ONBOARDING_FIELDS,
    strictTypeFiltering = true, // Default to true to ensure strict type matching
  } = params;

  const body: any = {
    textQuery,
    maxResultCount,
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.latitude,
          longitude: locationBias.longitude,
        },
        radius: locationBias.radius || 5000,
      },
    };
  }

  if (includedType) {
    body.includedType = includedType;
    // Add strictTypeFiltering if includedType is specified
    if (strictTypeFiltering) {
      body.strictTypeFiltering = true;
    }
  }

  try {
    const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map(transformPlace);
  } catch (error) {
    console.error('Error searching text:', error);
    throw error;
  }
}

/**
 * Get place details by place ID
 * Checks cache first, then fetches from API if needed
 */
export async function getPlaceDetails(
  params: PlaceDetailsParams,
  cacheTTLDays: number = 7
): Promise<PlaceBasicInfo | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  const { placeId, fieldMask = ONBOARDING_FIELDS_GET } = params;

  // Check cache first
  const cached = await getCachedPlace(placeId);
  if (cached) {
    console.log(`[Cache Hit] Place ${placeId}`);
    return cached as PlaceBasicInfo;
  }

  // Fetch from API
  try {
    const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`Place not found: ${placeId}`);
        return null;
      }
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const place = await response.json();
    const transformedPlace = transformPlace(place);

    // Cache the result
    await cachePlace(placeId, transformedPlace, cacheTTLDays);

    return transformedPlace;
  } catch (error) {
    console.error('Error getting place details:', error);
    throw error;
  }
}

/**
 * Get multiple place details with caching
 */
export async function getPlacesDetails(
  placeIds: string[],
  fieldMask: string = ONBOARDING_FIELDS_GET,
  cacheTTLDays: number = 7
): Promise<PlaceBasicInfo[]> {
  const promises = placeIds.map((placeId) =>
    getPlaceDetails({ placeId, fieldMask }, cacheTTLDays)
  );

  const results = await Promise.all(promises);
  return results.filter((place): place is PlaceBasicInfo => place !== null);
}

/**
 * Autocomplete for place search (for onboarding residential place, search bar)
 */
export async function autocompletePlace(
  input: string,
  includedPrimaryTypes: string[] = ['locality', 'administrative_area_level_1'],
  locationBias?: { lat: number; lng: number; radius?: number }
): Promise<Array<{ placeId: string; description: string }>> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  try {
    // Google Places API limits includedPrimaryTypes to maximum 5 values
    // Only include includedPrimaryTypes if it has values (don't send empty array)
    const limitedPrimaryTypes = includedPrimaryTypes.length > 0 ? includedPrimaryTypes.slice(0, 5) : undefined;
    
    const body: any = {
      input,
    };
    
    // Only add includedPrimaryTypes if we have valid types to filter by
    if (limitedPrimaryTypes && limitedPrimaryTypes.length > 0) {
      body.includedPrimaryTypes = limitedPrimaryTypes;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/google-places.ts:357',message:'autocompletePlace function entry',data:{input,hasIncludedPrimaryTypes:!!limitedPrimaryTypes,originalCount:includedPrimaryTypes.length,limitedCount:limitedPrimaryTypes?.length,includedPrimaryTypes:limitedPrimaryTypes,hasLocationBias:!!locationBias,locationBias},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    // Add locationBias if provided
    // According to Google Places API docs, autocomplete supports locationRestriction (hard limit) or locationBias (preference)
    // We use locationBias (preference) so results are biased toward the location but still return results if there aren't enough nearby
    if (locationBias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: locationBias.lat,
            longitude: locationBias.lng,
          },
          radius: locationBias.radius || 5000,
        },
      };
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/google-places.ts:375',message:'Request body before API call (post-fix)',data:{body,usingLocationBias:!!body.locationBias,usingLocationRestriction:!!body.locationRestriction},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    
    const response = await fetch(
      `${GOOGLE_PLACES_BASE_URL}/places:autocomplete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API autocomplete error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        requestBody: body,
      });
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const suggestions = data.suggestions || [];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/google-places.ts:413',message:'API response received',data:{responseStatus:response.status,hasSuggestions:!!data.suggestions,suggestionsCount:suggestions.length,rawResponseKeys:Object.keys(data),firstSuggestion:suggestions[0],allSuggestions:suggestions.slice(0,5).map((s:any)=>({description:s.placePrediction?.text?.text,placeId:s.placePrediction?.placeId,structuredFormat:s.placePrediction?.structuredFormat}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    return suggestions.map((suggestion: any) => ({
      placeId: suggestion.placePrediction?.placeId,
      description: suggestion.placePrediction?.text?.text || '',
    }));
  } catch (error) {
    console.error('Error autocompleting place:', error);
    throw error;
  }
}

/**
 * Get location (lat/lng) from place ID
 */
export async function getPlaceLocation(placeId: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  try {
    const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'location',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.location) {
      return {
        lat: data.location.latitude,
        lng: data.location.longitude,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting place location:', error);
    throw error;
  }
}
