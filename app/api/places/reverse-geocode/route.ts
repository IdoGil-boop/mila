import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * POST /api/places/reverse-geocode
 * Get full address from coordinates using Geocoding API
 * Uses Geocoding API (free tier: 40k/month) instead of Places API for cost efficiency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body as {
      lat: number;
      lng: number;
    };

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Valid lat and lng are required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      );
    }

    // Use Geocoding API for reverse geocoding (free tier: 40k/month)
    // This is more cost-effective than Places API searchNearby
    const response = await fetch(
      `${GEOCODING_API_URL}?latlng=${lat},${lng}&key=${GOOGLE_PLACES_API_KEY}&result_type=locality|administrative_area_level_1`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Geocoding API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Geocoding API error:', data.status, data.error_message);
      return NextResponse.json(
        { 
          error: 'Could not determine location',
          details: data.error_message || data.status,
        },
        { status: 400 }
      );
    }

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'Could not determine location - no results found' },
        { status: 404 }
      );
    }

    // Find the best result (prefer locality over administrative_area_level_1)
    const locality = data.results.find((r: any) =>
      r.types.includes('locality')
    );
    const adminArea = data.results.find((r: any) =>
      r.types.includes('administrative_area_level_1')
    );
    const result = locality || adminArea || data.results[0];

    // Extract place_id and formatted address
    const placeId = result.place_id;
    const formattedAddress = result.formatted_address;
    
    // Get a display name (city name or state name)
    const cityComponent = result.address_components.find((c: any) =>
      c.types.includes('locality')
    );
    const stateComponent = result.address_components.find((c: any) =>
      c.types.includes('administrative_area_level_1')
    );
    
    const displayName = cityComponent
      ? cityComponent.long_name
      : stateComponent
      ? stateComponent.long_name
      : formattedAddress.split(',')[0];

    return NextResponse.json({
      success: true,
      place: {
        placeId,
        description: formattedAddress,
        displayName,
        formattedAddress,
      },
    });
  } catch (error: any) {
    console.error('Error reverse geocode:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode', details: error.message },
      { status: 500 }
    );
  }
}

