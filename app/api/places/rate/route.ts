import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateSavedPlaceRating } from '@/lib/dynamodb';

/**
 * POST /api/places/rate
 * Rate a saved place (triggers BIO update in background)
 * IMPORTANT: Only accessible for saved places, not from main results
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { placeId, rating, notes } = body as {
      placeId: string;
      rating: number;
      notes?: string;
    };

    if (!placeId || !rating) {
      return NextResponse.json(
        { error: 'placeId and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Update rating
    await updateSavedPlaceRating(user.userId, placeId, rating, notes);

    // TODO: Trigger BIO update in background (async)
    // This should analyze the rating along with place attributes
    // and update the user's BIO to refine future recommendations
    // For now, we'll skip this to avoid blocking the response

    return NextResponse.json({
      success: true,
      message: 'Rating saved. This helps us improve your recommendations.',
    });
  } catch (error: any) {
    console.error('Error rating place:', error);
    return NextResponse.json(
      { error: 'Failed to rate place', details: error.message },
      { status: 500 }
    );
  }
}
