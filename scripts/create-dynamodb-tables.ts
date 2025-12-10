import { config } from 'dotenv';
import { resolve } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const client = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY!,
  },
});

const TABLES = {
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

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    return false;
  }
}

async function createUsersTable() {
  const tableName = TABLES.USERS;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createUserBiosTable() {
  const tableName = TABLES.USER_BIOS;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'version', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'version', AttributeType: 'N' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createUserPreferencesTable() {
  const tableName = TABLES.USER_PREFERENCES;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'category', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'category', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createSavedPlacesTable() {
  const tableName = TABLES.SAVED_PLACES;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'placeId', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'placeId', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createOnboardingSessionsTable() {
  const tableName = TABLES.ONBOARDING_SESSIONS;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createOnboardingMessagesTable() {
  const tableName = TABLES.ONBOARDING_MESSAGES;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'messageId', KeyType: 'HASH' },
        { AttributeName: 'messageType', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'messageId', AttributeType: 'S' },
        { AttributeName: 'messageType', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createSubscriptionsTable() {
  const tableName = TABLES.SUBSCRIPTIONS;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createBillingHistoryTable() {
  const tableName = TABLES.BILLING_HISTORY;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'billingId', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'billingId', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createRateLimitsTable() {
  const tableName = TABLES.RATE_LIMITS;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function createPlaceCacheTable() {
  const tableName = TABLES.PLACE_CACHE;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [{ AttributeName: 'placeId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'placeId', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );
  console.log(`✓ Created table ${tableName}`);
}

async function main() {
  console.log('Creating DynamoDB tables for Loca 2.0...\n');

  try {
    await createUsersTable();
    await createUserBiosTable();
    await createUserPreferencesTable();
    await createSavedPlacesTable();
    await createOnboardingSessionsTable();
    await createOnboardingMessagesTable();
    await createSubscriptionsTable();
    await createBillingHistoryTable();
    await createRateLimitsTable();
    await createPlaceCacheTable();

    console.log('\n✓ All tables created successfully!');
  } catch (error: any) {
    console.error('Error creating tables:', error.message);
    process.exit(1);
  }
}

main();

