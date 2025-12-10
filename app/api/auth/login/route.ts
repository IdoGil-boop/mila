import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Verify credentials
    const user = await verifyEmailPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}

