import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { savePlace } from '@/lib/dynamodb';
import { getPlaceDetails, ONBOARDING_FIELDS } from '@/lib/google-places';
import { PlaceCategory } from '@/types';

/**
 * POST /api/places/save
 * Save a place to user's collection
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { placeId, category, notes } = body as {
      placeId: string;
      category: PlaceCategory;
      notes?: string;
    };

    if (!placeId || !category) {
      return NextResponse.json(
        { error: 'placeId and category are required' },
        { status: 400 }
      );
    }

    // Fetch place details (from cache if available)
    const place = await getPlaceDetails({ placeId, fieldMask: ONBOARDING_FIELDS }, 7);

    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      );
    }

    // Save to database
    await savePlace({
      userId: user.userId,
      placeId,
      placeName: place.displayName,
      category,
      notes: notes || undefined,
      address: place.formattedAddress,
      photos: place.photos?.slice(0, 1), // Store just thumbnail
      types: place.types,
    });

    return NextResponse.json({
      success: true,
      message: 'Place saved successfully',
      place: {
        placeId,
        placeName: place.displayName,
        category,
        address: place.formattedAddress,
        photo: place.photos?.[0],
      },
    });
  } catch (error: any) {
    console.error('Error saving place:', error);
    return NextResponse.json(
      { error: 'Failed to save place', details: error.message },
      { status: 500 }
    );
  }
}
