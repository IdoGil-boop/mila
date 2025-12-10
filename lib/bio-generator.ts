import OpenAI from 'openai';
import { UserBIO, PlaceBasicInfo, PlaceCategory } from '@/types';
import { getUserBIO, updateUserBIO, createUserBIO } from './dynamodb';

// Lazy-load OpenAI client to avoid build-time initialization
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set. BIO generation features will not work.');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface PlaceSelection {
  place: PlaceBasicInfo;
  selected: boolean;
}

interface ABComparisonData {
  placeA: PlaceBasicInfo;
  placeB: PlaceBasicInfo;
  sliderValue: number; // 1-10 (1=strongly prefer A, 10=strongly prefer B, 5=neutral)
}

interface BIOUpdateParams {
  userId: string;
  category: PlaceCategory;
  selections?: PlaceSelection[]; // For multi-select questions
  comparison?: ABComparisonData; // For A/B comparison questions
}

interface NextQuestionStrategy {
  questionType: 'multi-select' | 'ab-comparison';
  queries: string[]; // 2-3 search query variations for multi-select, or contrasting attributes for A/B
  message?: string; // Optional message to show with the next question
  reasoning: string; // Internal reasoning (not shown to user)
}

/**
 * Initialize a new BIO for a user with selected categories
 */
export async function initializeBIO(userId: string, selectedCategories: PlaceCategory[]): Promise<UserBIO> {
  const bio: UserBIO = {
    userId,
    version: 1,
    bioText: 'User preference learning in progress.',
    categories: {},
    lastUpdated: new Date().toISOString(),
  };

  // Initialize empty category structures
  selectedCategories.forEach((category) => {
    bio.categories[category] = {
      keywords: [],
      preferredAttributes: [],
      stylePreferences: '',
      confidenceScore: 0,
    };
  });

  await createUserBIO(userId, bio);
  return bio;
}

/**
 * Update BIO based on user selections during onboarding
 */
export async function updateBIOFromSelections(params: BIOUpdateParams): Promise<{
  updatedBIO: UserBIO;
  confidenceScore: number;
  nextStrategy: NextQuestionStrategy | null;
}> {
  const { userId, category, selections, comparison } = params;

  // Get current BIO
  const bioData = await getUserBIO(userId);
  if (!bioData) {
    throw new Error('User BIO not found. Initialize BIO first.');
  }

  // Cast to UserBIO type
  let currentBIO: UserBIO = bioData as UserBIO;

  // Prepare context for OpenAI
  const currentCategoryData = currentBIO.categories[category] || {
    keywords: [],
    preferredAttributes: [],
    stylePreferences: '',
    confidenceScore: 0,
  };

  let prompt = '';

  if (selections) {
    // Multi-select question
    const selectedPlaces = selections.filter((s) => s.selected).map((s) => s.place);
    const rejectedPlaces = selections.filter((s) => !s.selected).map((s) => s.place);

    prompt = `You are analyzing user preferences for ${category} places.

Current user profile for this category:
- Keywords: ${currentCategoryData.keywords.join(', ') || 'none yet'}
- Preferred Attributes: ${currentCategoryData.preferredAttributes.join(', ') || 'none yet'}
- Style Preferences: ${currentCategoryData.stylePreferences || 'none yet'}
- Confidence Score: ${currentCategoryData.confidenceScore}

The user just selected ${selectedPlaces.length} places and rejected ${rejectedPlaces.length} places from a set of options.

Selected places:
${selectedPlaces.map((p, i) => `${i + 1}. ${p.displayName}
   Address: ${p.formattedAddress}
   Rating: ${p.rating}
   Price: ${p.priceLevel ? '$'.repeat(p.priceLevel) : 'N/A'}
   Types: ${p.types?.join(', ')}
   Attributes: ${getPlaceAttributes(p).join(', ') || 'none'}
`).join('\n')}

Rejected places:
${rejectedPlaces.map((p, i) => `${i + 1}. ${p.displayName}
   Address: ${p.formattedAddress}
   Rating: ${p.rating}
   Price: ${p.priceLevel ? '$'.repeat(p.priceLevel) : 'N/A'}
   Types: ${p.types?.join(', ')}
   Attributes: ${getPlaceAttributes(p).join(', ') || 'none'}
`).join('\n')}

Task: Update the user's profile for ${category} based on this selection. Return a JSON object with:
1. keywords: Array of specific keywords that describe what they like (e.g., ["specialty coffee", "minimalist design"])
2. preferredAttributes: Array of boolean attributes they seem to prefer (e.g., ["outdoor seating", "dog friendly"])
3. stylePreferences: A short natural language description of their taste (e.g., "prefers modern, minimalist spaces with natural light")
4. confidenceScore: A number 0-1 indicating how confident we are about their preferences
5. nextQuestionType: Either "multi-select" or "ab-comparison" depending on what would help learn more
6. nextQuestionQueries: Array of 2-3 search query strings OR contrasting attribute pairs to test next
7. nextQuestionMessage: A natural, conversational message (1-2 sentences) to show with the next question. Be friendly and encouraging. Don't reflect back what was learned. Match the question type.
8. reasoning: Why you chose this next question type and what you're trying to learn

Example JSON structure:
{
  "keywords": ["specialty coffee", "minimalist design"],
  "preferredAttributes": ["outdoor seating"],
  "stylePreferences": "prefers modern, minimalist spaces",
  "confidenceScore": 0.7,
  "nextQuestionType": "multi-select",
  "nextQuestionQueries": ["cozy coffee shops", "artisan cafes"],
  "nextQuestionMessage": "Here are some more coffee spots to explore!",
  "reasoning": "Testing preference for cozy vs modern spaces"
}

Return ONLY valid JSON, no markdown formatting.`;
  } else if (comparison) {
    // A/B comparison question
    const { placeA, placeB, sliderValue } = comparison;
    const preference = sliderValue < 5 ? 'placeA' : sliderValue > 5 ? 'placeB' : 'neutral';
    const strength = Math.abs(sliderValue - 5) / 5; // 0-1 scale

    prompt = `You are analyzing user preferences for ${category} places.

Current user profile for this category:
- Keywords: ${currentCategoryData.keywords.join(', ') || 'none yet'}
- Preferred Attributes: ${currentCategoryData.preferredAttributes.join(', ') || 'none yet'}
- Style Preferences: ${currentCategoryData.stylePreferences || 'none yet'}
- Confidence Score: ${currentCategoryData.confidenceScore}

The user just compared two places on a scale of 1-10, where 1 = strongly prefer A, 10 = strongly prefer B, 5 = neutral.
Their response: ${sliderValue} (${preference}, strength: ${strength.toFixed(2)})

Place A:
- Name: ${placeA.displayName}
- Address: ${placeA.formattedAddress}
- Rating: ${placeA.rating}
- Price: ${placeA.priceLevel ? '$'.repeat(placeA.priceLevel) : 'N/A'}
- Types: ${placeA.types?.join(', ')}
- Attributes: ${getPlaceAttributes(placeA).join(', ') || 'none'}

Place B:
- Name: ${placeB.displayName}
- Address: ${placeB.formattedAddress}
- Rating: ${placeB.rating}
- Price: ${placeB.priceLevel ? '$'.repeat(placeB.priceLevel) : 'N/A'}
- Types: ${placeB.types?.join(', ')}
- Attributes: ${getPlaceAttributes(placeB).join(', ') || 'none'}

Task: Update the user's profile for ${category} based on this comparison. Return a JSON object with:
1. keywords: Array of specific keywords that describe what they like
2. preferredAttributes: Array of boolean attributes they seem to prefer
3. stylePreferences: A short natural language description of their taste
4. confidenceScore: A number 0-1 indicating how confident we are about their preferences
5. nextQuestionType: Either "multi-select" or "ab-comparison"
6. nextQuestionQueries: Array of 2-3 search query strings OR contrasting attributes to test next
7. nextQuestionMessage: A natural, conversational message (1-2 sentences) to show with the next question. Be friendly and encouraging. Don't reflect back what was learned. Match the question type.
8. reasoning: Why you chose this next question type and what you're trying to learn

Example JSON structure:
{
  "keywords": ["specialty coffee", "minimalist design"],
  "preferredAttributes": ["outdoor seating"],
  "stylePreferences": "prefers modern, minimalist spaces",
  "confidenceScore": 0.7,
  "nextQuestionType": "ab-comparison",
  "nextQuestionQueries": ["cozy vs modern", "quiet vs lively"],
  "nextQuestionMessage": "Let's compare these two options - which appeals to you more?",
  "reasoning": "Testing preference for cozy vs modern spaces"
}

Return ONLY valid JSON, no markdown formatting.`;
  } else {
    throw new Error('Either selections or comparison must be provided');
  }

  // Call OpenAI
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a preference learning assistant. Analyze place selections to build accurate user taste profiles. Be specific and data-driven. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Update BIO
    currentBIO.categories[category] = {
      keywords: result.keywords || currentCategoryData.keywords,
      preferredAttributes: result.preferredAttributes || currentCategoryData.preferredAttributes,
      stylePreferences: result.stylePreferences || currentCategoryData.stylePreferences,
      confidenceScore: result.confidenceScore || currentCategoryData.confidenceScore,
    };

    // Generate natural language bioText
    currentBIO.bioText = await generateBIOText(currentBIO);
    currentBIO.lastUpdated = new Date().toISOString();

    // Save updated BIO
    await updateUserBIO(userId, currentBIO);

    // Return next question strategy
    const nextStrategy: NextQuestionStrategy | null = result.nextQuestionType
      ? {
          questionType: result.nextQuestionType,
          queries: result.nextQuestionQueries || [],
          message: result.nextQuestionMessage,
          reasoning: result.reasoning || '',
        }
      : null;

    return {
      updatedBIO: currentBIO,
      confidenceScore: result.confidenceScore || 0,
      nextStrategy,
    };
  } catch (error) {
    console.error('Error updating BIO:', error);
    throw error;
  }
}

/**
 * Generate natural language BIO text from structured data
 */
async function generateBIOText(bio: UserBIO): Promise<string> {
  const categorySummaries = Object.entries(bio.categories)
    .filter(([_, data]) => data.confidenceScore > 0.3)
    .map(
      ([category, data]) =>
        `${category}: ${data.stylePreferences || 'learning preferences'} (keywords: ${data.keywords.slice(0, 5).join(', ')})`
    )
    .join('\n');

  if (!categorySummaries) {
    return 'User preference learning in progress.';
  }

  const prompt = `Create a natural, human-readable 2-3 sentence summary of this user's place preferences:

${categorySummaries}

Make it sound personal and helpful, not robotic. Focus on their taste and style.`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You create friendly, natural summaries of user preferences. Be concise and warm.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    return response.choices[0].message.content || 'User preferences are being learned.';
  } catch (error) {
    console.error('Error generating BIO text:', error);
    return categorySummaries;
  }
}

/**
 * Generate search context from BIO for personalized search
 */
export async function generateSearchContext(
  userId: string,
  category: PlaceCategory,
  destination: string
): Promise<{
  keywords: string[];
  filters: Record<string, boolean>;
  searchQueries: string[];
}> {
  const bio = await getUserBIO(userId);
  if (!bio || !bio.categories[category]) {
    return {
      keywords: [],
      filters: {},
      searchQueries: [`${category} in ${destination}`],
    };
  }

  const categoryData = bio.categories[category];

  const prompt = `Based on this user's preferences for ${category} places, generate search parameters for finding places in ${destination}:

User preferences:
- Keywords: ${categoryData.keywords.join(', ')}
- Preferred Attributes: ${categoryData.preferredAttributes.join(', ')}
- Style: ${categoryData.stylePreferences}

Return a JSON object with:
1. keywords: Array of 5-10 search keywords
2. filters: Object with boolean attribute keys (e.g., {"outdoorSeating": true, "dogFriendly": true})
3. searchQueries: Array of 2-3 optimized search query strings for Google Places API

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You convert user preference profiles into optimized search parameters. Be specific and actionable.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      keywords: result.keywords || categoryData.keywords,
      filters: result.filters || {},
      searchQueries: result.searchQueries || [`${category} in ${destination}`],
    };
  } catch (error) {
    console.error('Error generating search context:', error);
    return {
      keywords: categoryData.keywords,
      filters: {},
      searchQueries: [`${category} in ${destination}`],
    };
  }
}

/**
 * Generate personalized explanation for why a place matches user preferences
 */
export async function generatePlaceExplanation(
  userId: string,
  category: PlaceCategory,
  place: PlaceBasicInfo
): Promise<string> {
  const bio = await getUserBIO(userId);
  if (!bio || !bio.categories[category]) {
    return 'This place matches your search criteria.';
  }

  const categoryData = bio.categories[category];

  const prompt = `Explain in 1-2 natural sentences why this place matches the user's preferences. Be specific but concise. Don't mention "BIO" or "algorithm" - sound helpful and human.

User preferences for ${category}:
- Style: ${categoryData.stylePreferences}
- Keywords: ${categoryData.keywords.slice(0, 5).join(', ')}
- Preferred attributes: ${categoryData.preferredAttributes.slice(0, 5).join(', ')}

Place:
- Name: ${place.displayName}
- Rating: ${place.rating}
- Attributes: ${getPlaceAttributes(place).join(', ')}

Write a natural explanation starting with "Great match -" or "Perfect for you -"`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write friendly, personalized explanations. Be natural and helpful.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0].message.content || 'This place matches your preferences.';
  } catch (error) {
    console.error('Error generating place explanation:', error);
    return 'This place matches your search criteria.';
  }
}

/**
 * Helper: Extract boolean attributes from a place
 */
function getPlaceAttributes(place: PlaceBasicInfo): string[] {
  const attributes: string[] = [];

  if (place.outdoorSeating) attributes.push('outdoor seating');
  if (place.allowsDogs) attributes.push('dog friendly');
  if (place.dineIn) attributes.push('dine-in');
  if (place.takeout) attributes.push('takeout');
  if (place.delivery) attributes.push('delivery');
  if (place.servesCoffee) attributes.push('serves coffee');
  if (place.goodForGroups) attributes.push('good for groups');
  if (place.servesBreakfast) attributes.push('breakfast');
  if (place.servesBrunch) attributes.push('brunch');
  if (place.servesVegetarianFood) attributes.push('vegetarian options');

  return attributes;
}

/**
 * Check if we should stop asking questions for a category
 */
export function shouldStopOnboarding(
  confidenceScore: number,
  questionsAsked: number,
  lastThreeVariances: number[]
): boolean {
  // Stop if confidence is high enough
  if (confidenceScore >= 0.85) {
    return true;
  }

  // Stop at max questions
  if (questionsAsked >= 10) {
    return true;
  }

  // Stop if no new learning (low variance in last 3 selections)
  if (lastThreeVariances.length === 3) {
    const avgVariance = lastThreeVariances.reduce((a, b) => a + b, 0) / 3;
    if (avgVariance < 0.1) {
      return true;
    }
  }

  return false;
}
