import { NextRequest, NextResponse } from 'next/server';
import { createEmailUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, dob, residentialPlace, residentialPlaceId } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Create user
    const user = await createEmailUser(email, password, name, dob, residentialPlace, residentialPlaceId);

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
    console.error('Signup error:', error);
    if (error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 });
  }
}

