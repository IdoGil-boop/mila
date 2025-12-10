import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// Lazy initialization of DynamoDB client
let dynamoDB: DynamoDBDocumentClient | null = null;

function getCredentials(): { accessKeyId: string; secretAccessKey: string; region: string } {
  const accessKeyId = process.env.DYNAMODB_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DYNAMODB_SECRET_ACCESS_KEY;
  const region = process.env.DYNAMODB_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials not configured. Set DYNAMODB_ACCESS_KEY_ID and DYNAMODB_SECRET_ACCESS_KEY environment variables.'
    );
  }

  return { accessKeyId, secretAccessKey, region };
}

async function getDynamoDB(): Promise<DynamoDBDocumentClient> {
  if (!dynamoDB) {
    const { accessKeyId, secretAccessKey, region } = getCredentials();

    const client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      maxAttempts: 3,
    });

    dynamoDB = DynamoDBDocumentClient.from(client);
  }

  return dynamoDB;
}

// Table names
export const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || 'mila-users',
  USER_BIOS: process.env.DYNAMODB_USER_BIOS_TABLE || 'mila-user-bios',
  USER_PREFERENCES: process.env.DYNAMODB_USER_PREFERENCES_TABLE || 'mila-user-preferences',
  SAVED_PLACES: process.env.DYNAMODB_SAVED_PLACES_TABLE || 'mila-saved-places',
  ONBOARDING_SESSIONS: process.env.DYNAMODB_ONBOARDING_SESSIONS_TABLE || 'mila-onboarding-sessions',
  ONBOARDING_MESSAGES: process.env.DYNAMODB_ONBOARDING_MESSAGES_TABLE || 'mila-onboarding-messages',
  SUBSCRIPTIONS: process.env.DYNAMODB_SUBSCRIPTIONS_TABLE || 'mila-subscriptions',
  BILLING_HISTORY: process.env.DYNAMODB_BILLING_HISTORY_TABLE || 'mila-billing-history',
  RATE_LIMITS: process.env.DYNAMODB_RATE_LIMITS_TABLE || 'mila-rate-limits',
  PLACE_CACHE: process.env.DYNAMODB_PLACE_CACHE_TABLE || 'mila-place-cache',
};

// User operations
export async function createUser(user: any) {
  const db = await getDynamoDB();
  await db.send(
    new PutCommand({
      TableName: TABLES.USERS,
      Item: {
        ...user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

export async function getUser(userId: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new GetCommand({
      TableName: TABLES.USERS,
      Key: { userId },
    })
  );
  return result.Item || null;
}

export async function getUserByEmail(email: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new ScanCommand({
      TableName: TABLES.USERS,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    })
  );
  return result.Items?.[0] || null;
}

export async function updateUser(userId: string, updates: any) {
  const db = await getDynamoDB();
  const updateExpression: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.keys(updates).forEach((key, index) => {
    updateExpression.push(`#${key}${index} = :val${index}`);
    expressionAttributeNames[`#${key}${index}`] = key;
    expressionAttributeValues[`:val${index}`] = updates[key];
  });

  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await db.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// User BIO operations
export async function createUserBIO(userId: string, bio: any) {
  const db = await getDynamoDB();
  await db.send(
    new PutCommand({
      TableName: TABLES.USER_BIOS,
      Item: {
        userId,
        version: 1,
        ...bio,
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

export async function getUserBIO(userId: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new QueryCommand({
      TableName: TABLES.USER_BIOS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false, // Get latest version first
      Limit: 1,
    })
  );
  return result.Items?.[0] || null;
}

export async function updateUserBIO(userId: string, bio: any) {
  const db = await getDynamoDB();
  const currentBio = await getUserBIO(userId);
  const nextVersion = currentBio ? currentBio.version + 1 : 1;

  await db.send(
    new PutCommand({
      TableName: TABLES.USER_BIOS,
      Item: {
        userId,
        version: nextVersion,
        ...bio,
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

// User preferences operations
export async function createUserPreference(userId: string, category: string, preference: any) {
  const db = await getDynamoDB();
  await db.send(
    new PutCommand({
      TableName: TABLES.USER_PREFERENCES,
      Item: {
        userId,
        category,
        ...preference,
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

export async function getUserPreference(userId: string, category: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new GetCommand({
      TableName: TABLES.USER_PREFERENCES,
      Key: { userId, category },
    })
  );
  return result.Item || null;
}

export async function updateUserPreference(userId: string, category: string, updates: any) {
  const db = await getDynamoDB();
  const updateExpression: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.keys(updates).forEach((key, index) => {
    updateExpression.push(`#${key}${index} = :val${index}`);
    expressionAttributeNames[`#${key}${index}`] = key;
    expressionAttributeValues[`:val${index}`] = updates[key];
  });

  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await db.send(
    new UpdateCommand({
      TableName: TABLES.USER_PREFERENCES,
      Key: { userId, category },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// Saved places operations
export async function savePlace(place: any) {
  const db = await getDynamoDB();
  await db.send(
    new PutCommand({
      TableName: TABLES.SAVED_PLACES,
      Item: {
        ...place,
        savedAt: new Date().toISOString(),
      },
    })
  );
}

export async function getSavedPlaces(userId: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new QueryCommand({
      TableName: TABLES.SAVED_PLACES,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    })
  );
  return result.Items || [];
}

export async function deleteSavedPlace(userId: string, placeId: string) {
  const db = await getDynamoDB();
  await db.send(
    new DeleteCommand({
      TableName: TABLES.SAVED_PLACES,
      Key: { userId, placeId },
    })
  );
}

export async function updateSavedPlaceRating(userId: string, placeId: string, rating: number, notes?: string) {
  const db = await getDynamoDB();
  await db.send(
    new UpdateCommand({
      TableName: TABLES.SAVED_PLACES,
      Key: { userId, placeId },
      UpdateExpression: 'SET #rating = :rating, #visitedAt = :visitedAt, #notes = :notes',
      ExpressionAttributeNames: {
        '#rating': 'rating',
        '#visitedAt': 'visitedAt',
        '#notes': 'notes',
      },
      ExpressionAttributeValues: {
        ':rating': rating,
        ':visitedAt': new Date().toISOString(),
        ':notes': notes || null,
      },
    })
  );
}

// Onboarding session operations
export async function createOnboardingSession(session: any) {
  const db = await getDynamoDB();
  await db.send(
    new PutCommand({
      TableName: TABLES.ONBOARDING_SESSIONS,
      Item: {
        ...session,
        lastActive: new Date().toISOString(),
      },
    })
  );
}

export async function getOnboardingSession(userId: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new GetCommand({
      TableName: TABLES.ONBOARDING_SESSIONS,
      Key: { userId },
    })
  );
  return result.Item || null;
}

export async function updateOnboardingSession(userId: string, updates: any) {
  const db = await getDynamoDB();
  const updateExpression: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.keys(updates).forEach((key, index) => {
    updateExpression.push(`#${key}${index} = :val${index}`);
    expressionAttributeNames[`#${key}${index}`] = key;
    expressionAttributeValues[`:val${index}`] = updates[key];
  });

  updateExpression.push('#lastActive = :lastActive');
  expressionAttributeNames['#lastActive'] = 'lastActive';
  expressionAttributeValues[':lastActive'] = new Date().toISOString();

  await db.send(
    new UpdateCommand({
      TableName: TABLES.ONBOARDING_SESSIONS,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// Onboarding messages operations
export async function getOnboardingMessage(messageType: string): Promise<{ text: string } | null> {
  const db = await getDynamoDB();
  const result = await db.send(
    new ScanCommand({
      TableName: TABLES.ONBOARDING_MESSAGES,
      FilterExpression: '#messageType = :messageType',
      ExpressionAttributeNames: { '#messageType': 'messageType' },
      ExpressionAttributeValues: { ':messageType': messageType },
    })
  );
  // Return random message from pool
  const messages = result.Items || [];
  const fallbackMessage = messages[Math.floor(Math.random() * messages.length)];
  
  if (fallbackMessage) {
    return { text: fallbackMessage.text };
  }
  
  return null;
}

// Subscription operations
export async function createSubscription(subscription: any) {
  const db = await getDynamoDB();
  await db.send(
    new PutCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Item: {
        ...subscription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

export async function getSubscription(userId: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new GetCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { userId },
    })
  );
  return result.Item || null;
}

export async function updateSubscription(userId: string, updates: any) {
  const db = await getDynamoDB();
  const updateExpression: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.keys(updates).forEach((key, index) => {
    updateExpression.push(`#${key}${index} = :val${index}`);
    expressionAttributeNames[`#${key}${index}`] = key;
    expressionAttributeValues[`:val${index}`] = updates[key];
  });

  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await db.send(
    new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// Place cache operations
export async function cachePlace(placeId: string, placeData: any, ttlDays: number = 7) {
  const db = await getDynamoDB();
  const ttl = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60; // TTL in seconds

  await db.send(
    new PutCommand({
      TableName: TABLES.PLACE_CACHE,
      Item: {
        placeId,
        ...placeData,
        ttl,
        cachedAt: new Date().toISOString(),
      },
    })
  );
}

export async function getCachedPlace(placeId: string) {
  const db = await getDynamoDB();
  const result = await db.send(
    new GetCommand({
      TableName: TABLES.PLACE_CACHE,
      Key: { placeId },
    })
  );
  return result.Item || null;
}

// Rate limiting operations
export async function checkRateLimit(userId: string, limit: number, windowHours: number = 12) {
  const db = await getDynamoDB();
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const result = await db.send(
    new GetCommand({
      TableName: TABLES.RATE_LIMITS,
      Key: { userId },
    })
  );

  const rateLimit = result.Item;
  if (!rateLimit || !rateLimit.lastReset || new Date(rateLimit.lastReset) < new Date(windowStart)) {
    // Reset counter
    await db.send(
      new PutCommand({
        TableName: TABLES.RATE_LIMITS,
        Item: {
          userId,
          count: 1,
          lastReset: new Date().toISOString(),
        },
      })
    );
    return { allowed: true, remaining: limit - 1 };
  }

  if (rateLimit.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter
  await db.send(
    new UpdateCommand({
      TableName: TABLES.RATE_LIMITS,
      Key: { userId },
      UpdateExpression: 'SET #count = #count + :inc',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':inc': 1 },
    })
  );

  return { allowed: true, remaining: limit - rateLimit.count - 1 };
}

