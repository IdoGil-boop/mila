import { NextRequest, NextResponse } from 'next/server';
import { getUserProfileFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserProfileFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = user as any;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get user' }, { status: 500 });
  }
}

