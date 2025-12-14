import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deleteSavedPlace } from '@/lib/dynamodb';
import { getPlaceDetails, ONBOARDING_FIELDS_GET } from '@/lib/google-places';

/**
 * GET /api/places/[placeId]
 * Get place details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { placeId: string } }
) {
  const { placeId } = params;

  try {
    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId is required' },
        { status: 400 }
      );
    }

    const place = await getPlaceDetails({ placeId, fieldMask: ONBOARDING_FIELDS_GET }, 7);

    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      place,
    });
  } catch (error: any) {
    console.error('Error getting place details:', error);
    return NextResponse.json(
      { error: 'Failed to get place details', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/places/[placeId]
 * Remove a saved place
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { placeId: string } }
) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;
  const { placeId } = params;

  try {
    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId is required' },
        { status: 400 }
      );
    }

    await deleteSavedPlace(user.userId, placeId);

    return NextResponse.json({
      success: true,
      message: 'Place removed from saved list',
    });
  } catch (error: any) {
    console.error('Error deleting saved place:', error);
    return NextResponse.json(
      { error: 'Failed to delete place', details: error.message },
      { status: 500 }
    );
  }
}
