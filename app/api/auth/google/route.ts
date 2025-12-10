import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleToken, createOrGetGoogleUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Verify Google token
    const googleUser = await verifyGoogleToken(token);
    if (!googleUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create or get user
    const user = await createOrGetGoogleUser(googleUser);

    // Generate JWT token
    const jwtToken = generateToken(user);

    return NextResponse.json({
      token: jwtToken,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}

