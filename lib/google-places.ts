import { PlaceBasicInfo } from '@/types';
import { cachePlace, getCachedPlace } from './dynamodb';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('GOOGLE_PLACES_API_KEY not set. Google Places features will not work.');
}

// Field masks for cost optimization
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

  const body = {
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

  const { placeId, fieldMask = ONBOARDING_FIELDS } = params;

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
  fieldMask: string = ONBOARDING_FIELDS,
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
  types: string[] = ['locality', 'administrative_area_level_1']
): Promise<Array<{ placeId: string; description: string }>> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  try {
    const response = await fetch(
      `${GOOGLE_PLACES_BASE_URL}/places:autocomplete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: types,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const suggestions = data.suggestions || [];

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
