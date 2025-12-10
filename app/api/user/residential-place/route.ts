import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateUser, getUser } from '@/lib/dynamodb';
import { getPlaceDetails } from '@/lib/google-places';

/**
 * PUT /api/user/residential-place
 * Update user's residential place
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { placeId, formattedAddress, displayName } = body as { 
      placeId: string;
      formattedAddress?: string;
      displayName?: string;
    };

    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId is required' },
        { status: 400 }
      );
    }

    // If formattedAddress is provided (from reverse geocoding), use it directly
    // Otherwise, try to get it from Places API
    let residentialPlaceName = formattedAddress || displayName;
    
    if (!residentialPlaceName) {
      try {
        const place = await getPlaceDetails({ placeId }, 7);
        if (place) {
          residentialPlaceName = place.formattedAddress || place.displayName;
        }
      } catch (error) {
        console.warn('Could not fetch place details, using placeId as fallback:', error);
        // If Places API fails, we'll just use the placeId
        residentialPlaceName = placeId;
      }
    }

    // Update user profile
    await updateUser(user.userId, {
      residentialPlace: residentialPlaceName || placeId,
      residentialPlaceId: placeId,
    });

    return NextResponse.json({
      success: true,
      message: 'Residential place updated',
      residentialPlace: residentialPlaceName || placeId,
      residentialPlaceId: placeId,
    });
  } catch (error: any) {
    console.error('Error updating residential place:', error);
    return NextResponse.json(
      { error: 'Failed to update residential place', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/residential-place
 * Get user's residential place
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const userProfile = await getUser(user.userId);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      residentialPlace: userProfile.residentialPlace,
      residentialPlaceId: userProfile.residentialPlaceId,
    });
  } catch (error: any) {
    console.error('Error getting residential place:', error);
    return NextResponse.json(
      { error: 'Failed to get residential place', details: error.message },
      { status: 500 }
    );
  }
}

