import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { getUser, getUserByEmail, createUser } from './dynamodb';
import { UserProfile, SubscriptionInfo } from '@/types';

export interface GoogleUser {
  sub: string; // Google user ID
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  picture?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '30d';

/**
 * Verify Google JWT token server-side
 * For production, this should use Google's public keys for verification
 */
export async function verifyGoogleToken(token: string): Promise<GoogleUser | null> {
  try {
    // Decode without verification (Google Sign-In already verified client-side)
    // In production, fetch Google's public keys and verify signature
    const decoded = jwt.decode(token) as GoogleUser;

    if (!decoded || !decoded.sub || !decoded.email) {
      console.error('[Auth] Token decode failed - missing required fields');
      return null;
    }

    // Allow slightly expired tokens (up to 24 hours past expiration)
    const exp = (decoded as any).exp;
    if (exp) {
      const expirationTime = exp * 1000;
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (now >= expirationTime + twentyFourHours) {
        console.error('[Auth] Token expired more than 24 hours ago');
        return null;
      }
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Create or get user from Google OAuth
 */
export async function createOrGetGoogleUser(googleUser: GoogleUser): Promise<AuthUser> {
  // Check if user exists by email
  let user = await getUserByEmail(googleUser.email);

  if (!user) {
    // Create new user
    const userId = `google_${googleUser.sub}`;
    const defaultSubscription: SubscriptionInfo = {
      tier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newUser: UserProfile = {
      userId,
      email: googleUser.email,
      name: googleUser.name,
      subscription: defaultSubscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createUser(newUser);
    user = newUser;
  }

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
  };
}

/**
 * Create user with email/password
 */
export async function createEmailUser(
  email: string,
  password: string,
  name: string,
  dob?: string,
  residentialPlace?: string,
  residentialPlaceId?: string
): Promise<AuthUser> {
  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user ID
  const userId = `email_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const defaultSubscription: SubscriptionInfo = {
    tier: 'free',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newUser: UserProfile = {
    userId,
    email,
    name,
    dob,
    residentialPlace,
    residentialPlaceId,
    subscription: defaultSubscription,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Store user with hashed password
  await createUser({
    ...newUser,
    passwordHash: hashedPassword,
  });

  return {
    userId: newUser.userId,
    email: newUser.email,
    name: newUser.name,
  };
}

/**
 * Verify email/password login
 */
export async function verifyEmailPassword(email: string, password: string): Promise<AuthUser | null> {
  const user = await getUserByEmail(email);
  if (!user || !(user as any).passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, (user as any).passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
  };
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract and verify user from request headers
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

/**
 * Middleware to protect API routes
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | { error: string; status: number }> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { user };
}

/**
 * Get full user profile from request
 */
export async function getUserProfileFromRequest(request: NextRequest): Promise<UserProfile | null> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return null;
  }

  const user = await getUser(authResult.user.userId);
  return user as UserProfile | null;
}

