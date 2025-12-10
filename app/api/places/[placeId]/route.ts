import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deleteSavedPlace } from '@/lib/dynamodb';

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
