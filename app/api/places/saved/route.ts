import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSavedPlaces } from '@/lib/dynamodb';

/**
 * GET /api/places/saved
 * Get user's saved places
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const places = await getSavedPlaces(user.userId);

    // Group by category
    const groupedByCategory: Record<string, any[]> = {};
    places.forEach((place) => {
      const category = place.category || 'other';
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
      }
      groupedByCategory[category].push(place);
    });

    return NextResponse.json({
      success: true,
      places,
      groupedByCategory,
      totalCount: places.length,
    });
  } catch (error: any) {
    console.error('Error getting saved places:', error);
    return NextResponse.json(
      { error: 'Failed to get saved places', details: error.message },
      { status: 500 }
    );
  }
}
