import { config } from 'dotenv';
import { resolve } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const client = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY!,
  },
});

const dynamoDB = DynamoDBDocumentClient.from(client);
const MESSAGES_TABLE = process.env.DYNAMODB_ONBOARDING_MESSAGES_TABLE || 'mila-onboarding-messages';

// Dynamic message templates
// CRITICAL: Never reflect back what we've learned - avoid triggering resistance
const messageTemplates = [
  // Welcome messages
  {
    messageId: 'welcome-1',
    messageType: 'welcome',
    text: 'What kinds of places do you love to discover?',
    usageCount: 0,
  },
  {
    messageId: 'welcome-2',
    messageType: 'welcome',
    text: 'Help us understand your taste - pick any categories that interest you',
    usageCount: 0,
  },
  {
    messageId: 'welcome-3',
    messageType: 'welcome',
    text: 'Which experiences matter most to you when exploring a new city?',
    usageCount: 0,
  },

  // Question intro (multi-select)
  {
    messageId: 'question-intro-1',
    messageType: 'question_intro',
    text: 'Which of these {category} spots in {city} catch your eye?',
    usageCount: 0,
  },
  {
    messageId: 'question-intro-2',
    messageType: 'question_intro',
    text: 'Here are some {category} options in {city} - pick any that appeal to you',
    usageCount: 0,
  },
  {
    messageId: 'question-intro-3',
    messageType: 'question_intro',
    text: 'Take a look at these {category} places - what stands out to you?',
    usageCount: 0,
  },
  {
    messageId: 'question-intro-4',
    messageType: 'question_intro',
    text: 'Check out these {category} options - select any you like',
    usageCount: 0,
  },

  // Continue exploring (multi-select)
  {
    messageId: 'continue-1',
    messageType: 'continue_exploring',
    text: "Let's keep going - here are some more {category} options",
    usageCount: 0,
  },
  {
    messageId: 'continue-2',
    messageType: 'continue_exploring',
    text: 'How about these {category} places?',
    usageCount: 0,
  },
  {
    messageId: 'continue-3',
    messageType: 'continue_exploring',
    text: "Here's another set of {category} options to consider",
    usageCount: 0,
  },
  {
    messageId: 'continue-4',
    messageType: 'continue_exploring',
    text: 'Take a look at these {category} spots',
    usageCount: 0,
  },
  {
    messageId: 'continue-5',
    messageType: 'continue_exploring',
    text: 'Here are a few more {category} places',
    usageCount: 0,
  },

  // Style contrast (multi-select with variety)
  {
    messageId: 'style-contrast-1',
    messageType: 'style_contrast',
    text: 'Here are some different vibes - which appeals to you more?',
    usageCount: 0,
  },
  {
    messageId: 'style-contrast-2',
    messageType: 'style_contrast',
    text: 'Take a look at these contrasting options',
    usageCount: 0,
  },
  {
    messageId: 'style-contrast-3',
    messageType: 'style_contrast',
    text: "Here's a mix of styles - what catches your attention?",
    usageCount: 0,
  },
  {
    messageId: 'style-contrast-4',
    messageType: 'style_contrast',
    text: 'These have different feels - which ones do you like?',
    usageCount: 0,
  },
  {
    messageId: 'style-contrast-5',
    messageType: 'style_contrast',
    text: 'Trying something different - what appeals to you here?',
    usageCount: 0,
  },

  // A/B comparison intro
  {
    messageId: 'comparison-1',
    messageType: 'comparison_intro',
    text: 'Between these two, which do you prefer?',
    usageCount: 0,
  },
  {
    messageId: 'comparison-2',
    messageType: 'comparison_intro',
    text: 'Compare these two {category} places',
    usageCount: 0,
  },
  {
    messageId: 'comparison-3',
    messageType: 'comparison_intro',
    text: 'Which of these two is more your style?',
    usageCount: 0,
  },
  {
    messageId: 'comparison-4',
    messageType: 'comparison_intro',
    text: 'Take a look at both - which would you choose?',
    usageCount: 0,
  },
  {
    messageId: 'comparison-5',
    messageType: 'comparison_intro',
    text: 'Between A and B, which one appeals to you more?',
    usageCount: 0,
  },

  // Nearing completion
  {
    messageId: 'nearing-1',
    messageType: 'nearing_completion',
    text: 'Just a few more questions',
    usageCount: 0,
  },
  {
    messageId: 'nearing-2',
    messageType: 'nearing_completion',
    text: 'Almost done with {category}',
    usageCount: 0,
  },
  {
    messageId: 'nearing-3',
    messageType: 'nearing_completion',
    text: 'A couple more to go',
    usageCount: 0,
  },
  {
    messageId: 'nearing-4',
    messageType: 'nearing_completion',
    text: 'Nearly there - just a bit more',
    usageCount: 0,
  },

  // Completion
  {
    messageId: 'completion-1',
    messageType: 'completion',
    text: 'All set with {category}! Ready for the next one?',
    usageCount: 0,
  },
  {
    messageId: 'completion-2',
    messageType: 'completion',
    text: 'Great! Moving on to the next category',
    usageCount: 0,
  },
  {
    messageId: 'completion-3',
    messageType: 'completion',
    text: "{category} complete - let's continue",
    usageCount: 0,
  },
  {
    messageId: 'completion-4',
    messageType: 'completion',
    text: 'Done with {category} - ready for more?',
    usageCount: 0,
  },

  // Transition between categories
  {
    messageId: 'transition-1',
    messageType: 'transition',
    text: "Let's explore {category} next",
    usageCount: 0,
  },
  {
    messageId: 'transition-2',
    messageType: 'transition',
    text: 'Moving on to {category}',
    usageCount: 0,
  },
  {
    messageId: 'transition-3',
    messageType: 'transition',
    text: 'Now for {category} places',
    usageCount: 0,
  },
  {
    messageId: 'transition-4',
    messageType: 'transition',
    text: "Next up: {category}",
    usageCount: 0,
  },
];

async function clearExistingMessages() {
  console.log('Checking for existing messages...');
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: MESSAGES_TABLE,
    })
  );

  if (result.Items && result.Items.length > 0) {
    console.log(`Found ${result.Items.length} existing messages (keeping them)`);
  }
}

async function seedMessages() {
  console.log(`Seeding ${messageTemplates.length} message templates to ${MESSAGES_TABLE}...\n`);

  let seeded = 0;
  for (const message of messageTemplates) {
    try {
      await dynamoDB.send(
        new PutCommand({
          TableName: MESSAGES_TABLE,
          Item: {
            ...message,
            lastUsed: null,
          },
        })
      );
      seeded++;
      console.log(`✓ Seeded: ${message.messageId} (${message.messageType})`);
    } catch (error: any) {
      console.error(`✗ Failed to seed ${message.messageId}:`, error.message);
    }
  }

  console.log(`\n✓ Successfully seeded ${seeded} message templates!`);
}

async function main() {
  console.log('Seeding dynamic message templates for Loca 2.0...\n');

  try {
    await clearExistingMessages();
    await seedMessages();
  } catch (error: any) {
    console.error('Error seeding messages:', error.message);
    process.exit(1);
  }
}

main();
