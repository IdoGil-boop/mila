import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateUser } from '@/lib/dynamodb';

/**
 * PUT /api/user/profile
 * Update user profile (name, dob)
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { name, dob } = body as { 
      name?: string;
      dob?: string;
    };

    const updates: any = {};
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (dob !== undefined) {
      // Validate date format (YYYY-MM-DD)
      if (dob && dob.trim().length > 0) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dob)) {
          return NextResponse.json(
            { error: 'Date of birth must be in YYYY-MM-DD format' },
            { status: 400 }
          );
        }
        // Validate it's a valid date
        const date = new Date(dob);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date' },
            { status: 400 }
          );
        }
        updates.dob = dob;
      } else {
        updates.dob = undefined; // Allow clearing dob
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update user profile
    await updateUser(user.userId, updates);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}

