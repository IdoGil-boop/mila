import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserBIO } from '@/lib/dynamodb';
import { UserBIO } from '@/types';

/**
 * GET /api/bio
 * Get user's current BIO (only accessible from profile page)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const bio = await getUserBIO(user.userId);
    
    if (!bio) {
      return NextResponse.json({
        success: true,
        bio: null,
        message: 'No BIO found. Complete onboarding to generate your BIO.',
      });
    }

    // Return BIO in readable format
    const bioData = bio as UserBIO;
    
    return NextResponse.json({
      success: true,
      bio: {
        bioText: bioData.bioText,
        categories: bioData.categories,
        version: bioData.version,
        lastUpdated: bioData.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error getting BIO:', error);
    return NextResponse.json(
      { error: 'Failed to get BIO', details: error.message },
      { status: 500 }
    );
  }
}

