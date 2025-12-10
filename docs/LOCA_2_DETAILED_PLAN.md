# Loca 2.0 - Personalized Place Discovery Platform (Detailed Plan)

## Overview

A next-generation place discovery platform that learns user preferences through an interactive onboarding process, builds a personalized BIO (kept subtle/voluntary), and provides tailored recommendations without requiring origin places. Monetized through personalized hotel promotions.

## Core Refinements (Latest Updates)

- **No pattern reflection**: Never tell users "You picked X, let's test Y" - avoid triggering resistance
- **Pro SKU only for onboarding**: Use cost-optimized fields to minimize expenses
- **Two question types**: Multi-select (4 cards) AND A/B comparison (2 places + 1-10 slider)
- **Subtle BIO**: User profile stays in background, only visible in profile section by user choice
- **Dynamic onboarding**: Randomized, conversational messages - not repetitive patterns
- **No emojis**: Professional, clean interface throughout
- **Rich place cards**: Up to 4 images per place, descriptions, reviews - like elsebrew results
- **Dropdown saved places**: Compact dropdown (like Loca) with rate/remove functionality
- **Rate/review only from saved dropdown**: No rating from main results - only saved places
- **Mobile list/map toggle**: Toggle button + adjustable split with draggable divider
- **Google Places types as categories**: Use official Google Places API types
- **Always-available search**: Search bar present throughout onboarding
- **Stripe subscriptions**: Use Stripe for Apple Pay + Google Pay support (replacing PayPal)

## Technical Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Next.js API routes, DynamoDB, Paddle subscriptions (Apple Pay + Google Pay)
- **AI**: OpenAI (GPT-4o for BIO generation/updates, GPT-4o-mini for updates)
- **Maps**: Google Places API (New), Google Maps JavaScript API
- **Auth**: Google OAuth + manual signup (email/password)

**Note**: Using Paddle instead of Stripe because Paddle supports Israeli merchant accounts and has native Apple Pay + Google Pay recurring subscription support.

## Phase 1: Project Setup & Architecture

### 1.1 Initialize Project

- Create new directory: `loca-2.0/`
- Initialize Next.js 14 project with TypeScript
- Set up Tailwind CSS, Framer Motion (no emojis in config)
- Configure environment variables
- Set up Git repository

### 1.2 Google Places Types & Cost-Optimized Fields

Based on [Google Places API documentation](https://developers.google.com/maps/documentation/places/web-service/data-fields):

**Onboarding Field Strategy** (Pro SKU + Essentials only):

- **Essentials** (lowest cost): `displayName`, `formattedAddress`, `types`, `shortFormattedAddress`, `viewport`
- **Pro** (mid cost): `photos`, `reviews`, `rating`, `priceLevel`, `regularOpeningHours`, `location`, `accessibilityOptions`
- **Enterprise** (HIGH cost - AVOID in onboarding): `userRatingCount`, `websiteUri`
- **Enterprise + Atmosphere** (HIGHEST cost - AVOID in onboarding): `dineIn`, `takeout`, `outdoorSeating`, `servesCoffee`, `allowsDogs`, etc.

**Onboarding field mask** (cost-optimized):
```
displayName,photos,reviews,rating,formattedAddress,types,priceLevel,regularOpeningHours
```

**Main search field mask** (premium users only):
```
displayName,photos,reviews,rating,userRatingCount,formattedAddress,types,priceLevel,
regularOpeningHours,websiteUri,dineIn,takeout,outdoorSeating,servesCoffee,allowsDogs,
goodForGroups,servesBreakfast,servesBrunch,accessibilityOptions
```

**Major Categories** (for onboarding):

- `cafe`, `coffee_shop` - Coffee & Cafes
- `restaurant` - Restaurants
- `bar`, `night_club` - Bars & Nightlife
- `museum`, `art_gallery` - Museums & Galleries
- `store`, `shopping_mall`, `clothing_store`, `book_store` - Shopping
- `park`, `tourist_attraction` - Parks & Attractions
- `movie_theater`, `bowling_alley`, `amusement_park` - Entertainment
- `library` - Libraries
- `gym`, `spa` - Wellness
- `bakery` - Bakeries
- Plus 100+ more specific types

### 1.3 Database Schema (DynamoDB)

Tables needed:

- **users** - User profiles (BIO stored here but not surfaced unless requested)
  - userId (PK), email, name, dob, residentialPlace, residentialPlaceId, createdAt
- **user-bios** - Versioned user BIO with history (hidden from main UI)
  - userId (PK), version (SK), bioText, categories (map), confidenceScores, updatedAt
- **user-preferences** - Category-specific preferences (internal use)
  - userId (PK), category (SK), selectedPlaceIds[], preferenceVector, confidence, updatedAt
- **saved-places** - User's saved places with ratings
  - userId (PK), placeId (SK), placeName, category, rating, visitedAt, savedAt, notes
- **onboarding-sessions** - Track onboarding progress
  - userId (PK), currentStep, currentCategory, questionsAsked, completed, lastActive
- **onboarding-messages** - Pool of dynamic messages
  - messageId (PK), messageType (SK), text, usageCount, lastUsed
- **subscriptions** - Paddle subscription management (customerId, subscriptionId, status, tier, planId, etc.)
- **billing-history** - Pay-as-you-go billing
- **rate-limits** - Rate limiting
- **place-cache** - Cached Google Places data with TTL (includes photos, reviews)

### 1.4 Type Definitions

```typescript
// Google Places types - from official API documentation
type PlaceCategory = 
  | 'cafe' | 'coffee_shop' | 'restaurant' | 'bar' | 'night_club'
  | 'museum' | 'art_gallery' | 'park' | 'tourist_attraction'
  | 'store' | 'shopping_mall' | 'clothing_store' | 'book_store'
  | 'movie_theater' | 'library' | 'bakery' | 'gym' | 'spa'
  | string; // 100+ more types available

interface UserBIO {
  userId: string;
  version: number;
  bioText: string; // Internal natural language description
  categories: {
    [category: string]: {
      keywords: string[];
      preferredAttributes: string[]; // e.g., ["outdoor seating", "dog friendly"]
      stylePreferences: string; // e.g., "minimalist Norwegian design"
      confidenceScore: number; // 0-1
    }
  };
  lastUpdated: string;
  // Note: BIO not shown to user by default, only in profile if they click
}

interface OnboardingPlaceCard {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  photos: string[]; // Up to 4 photo URLs (Pro SKU)
  description?: string; // First review snippet (from reviews Pro SKU field)
  reviews?: {
    text: string;
    rating: number;
    authorName: string;
  }[];
  types: string[];
}

interface ABComparison {
  placeA: OnboardingPlaceCard;
  placeB: OnboardingPlaceCard;
  sliderValue: number; // 1-10 (1=strongly prefer A, 10=strongly prefer B, 5=neutral)
}

interface DynamicMessage {
  id: string;
  type: 'welcome' | 'category_intro' | 'question' | 'transition' | 'completion';
  templates: string[]; // Multiple variations to randomize
  variables: string[]; // Placeholders like {category}, {city}
}
```

## Phase 2: Authentication & Onboarding UI

### 2.1 Authentication System

- **Google OAuth**: Custom JWT implementation (port from elsebrew)
- **Manual signup**: Email/password with validation
- **Required fields**: name, email, DOB, residential place (Google Places autocomplete for cities)
- **Token management**: JWT with 30-day expiration
- **Protected routes**: Middleware for authenticated pages

### 2.2 Onboarding Flow - Step 1: Account Creation

**Route**: `/onboarding/signup`

**UI Design**:

- Clean hero section with tagline
- Two signup options: Google button (primary) + manual form
- Manual form fields: name, email, password, DOB, residential city (Google Places autocomplete)
- Friendly messaging: "Let's discover your perfect places, wherever you go"
- No emojis - use clean iconography instead

### 2.3 Onboarding Flow - Step 2: Category Selection

**Route**: `/onboarding/categories`

**UI Design**:

- Dynamic welcome message (randomized from pool):
  - "What kinds of places do you love to discover?"
  - "Help us understand your taste - pick any categories that interest you"
  - "Which experiences matter most to you when exploring a new city?"
- Visual cards for major categories (using Google Places types):
  - Coffee & Cafes (`cafe`, `coffee_shop`)
  - Restaurants (`restaurant`)
  - Bars & Nightlife (`bar`, `night_club`)
  - Museums & Culture (`museum`, `art_gallery`)
  - Shopping (`store`, `shopping_mall`, `clothing_store`, `book_store`)
  - Parks & Outdoors (`park`, `tourist_attraction`)
  - Entertainment (`movie_theater`, `bowling_alley`)
  - Libraries (`library`)
  - Wellness (`gym`, `spa`)
- Multi-select with visual feedback
- "Why we ask" explanation (subtle, expandable): "This helps us show you places that match your interests when you travel"
- **Persistent search bar at top**: "Or search for specific places you love" (Google Places autocomplete, filtered to residential area)

### 2.4 Onboarding Flow - Step 3: Iterative Place Discovery

**Route**: `/onboarding/discover/:category`

**Layout**:

- **Top**: Persistent search bar (Google Places autocomplete, constrained to residential area)
- **Dynamic Message Area**: Rotating questions/context (never repetitive, never reflects patterns back)
- **Place Cards Grid**: 4 rich cards per question (multi-select) OR 2 cards + slider (A/B comparison)
- **Progress**: Subtle indicator (dots or slim bar)
- **Actions**: "Next question", "I'm done with this category", "Skip this question"

**Rich Place Card Design** (Pro SKU fields only, cost-optimized):

- Up to 4 photos in grid layout (2x2 or carousel)
- Place name (bold)
- Rating only (no user count - that's Enterprise SKU)
- Address (truncated)
- Description: First review snippet (2-3 sentences) from reviews field (Pro SKU)
- "Quick info" tags: Price level, hours (from Pro SKU fields only)
- Checkbox for selection (multi-select) or automatic selection (A/B comparison)
- Click to expand: Full reviews (2-3), all photos
- **Note**: Use only Pro SKU data fields during onboarding to minimize costs

**Dynamic Message System**:

Store message templates in database with variables. **Critical: Never reflect back what we've learned** - this triggers resistance. Keep messages neutral and forward-looking.

```typescript
const messageTemplates = {
  question_intro: [
    "Which of these {category} spots in {city} catch your eye?",
    "Here are some {category} options in {city} - pick any that appeal to you",
    "Take a look at these {category} places - what stands out to you?",
  ],
  continue_exploring: [
    "Let's keep going - here are some more {category} options",
    "How about these {category} places?",
    "Here's another set of {category} options to consider",
  ],
  style_contrast: [
    "Here are some different vibes - which appeals to you more?",
    "Take a look at these contrasting options",
    "Here's a mix of styles - what catches your attention?",
  ],
  comparison_intro: [
    "Between these two, which do you prefer?",
    "Compare these two {category} places",
    "Which of these two is more your style?",
  ],
  nearing_completion: [
    "Just a few more questions",
    "Almost done with {category}",
    "A couple more to go",
  ],
  completion: [
    "All set with {category}! Ready for the next one?",
    "Great! Moving on to the next category",
    "{category} complete - let's continue",
  ],
};
```

**Iterative Flow**:

1. **Question 1**: Show 4 random popular places from category in residential area
   - Fetch from Google Places with **Pro SKU fields only**
   - Allow multiple selection + search bar option
   
2. **Questions 2-10**: AI-driven progression with two question types:
   
   **Type A: Multi-select (4 cards)**
   - After each selection, OpenAI analyzes choices + updates BIO
   - BIO update determines what to test next
   - Generate 2-3 different query variations
   - Mix results from different queries in the 4 cards shown
   - Message: Neutral, forward-looking (never "you picked X, let's see Y")
   - Examples: "Here are some different vibes", "How about these options?"
   
   **Type B: A/B Comparison (2 cards + slider)**
   - Show 2 contrasting places
   - Slider (1-10 scale): "How much do you prefer A vs B?"
   - Position 1 = strongly prefer A, 10 = strongly prefer B, 5 = no preference
   - No tick marks on slider (continuous)
   - Message: "Between these two, which do you prefer?"
   - Use when testing specific style contrasts
   - Slider value indicates preference strength for BIO update

3. **Stop Conditions**:
   - Max 10 questions per category
   - User clicks "I'm done with this category"
   - Confidence score >= 0.85 (AI determines sufficient information)
   - No new learning: Last 3 selections show equal distribution (variance < threshold)

4. **Progress Indicators**:
   - Dots or slim progress bar
   - Current question count (subtle): "Question 3 of ~10"
   - No BIO shown during onboarding (stays hidden)
   - Never show what we've learned - avoid triggering user resistance

### 2.5 Onboarding Flow - Completion

**Route**: `/onboarding/complete`

**UI Design**:

- Celebration animation (subtle, tasteful)
- Simple completion message (randomized):
  - "Your profile is ready! Let's start exploring"
  - "All set! You're ready to discover amazing places anywhere"
  - "Perfect - now let's find your next favorite spot"
- No BIO display here - keep it subtle
- CTA: "Start Exploring" → Main app (`/`)

## Phase 3: Core API Routes

### 3.1 Onboarding APIs

**`POST /api/onboarding/initialize`**

- Create user record
- Initialize onboarding session
- Return session ID

**`GET /api/onboarding/session`**

- Get current onboarding progress
- Return current step, category, questions asked

**`POST /api/onboarding/select-categories`**

- Save selected categories (Google Places types)
- Initialize category preference records

**`POST /api/onboarding/get-question`**

- Input: userId, category, currentBIO, previousSelections, questionNumber
- Fetch dynamic message from pool (randomize)
- If questionNumber > 1: Use BIO to generate 2-3 query variations
- Query Google Places API with **Pro SKU fields only** (cost optimization):
  ```
  fields: displayName,photos,reviews,rating,formattedAddress,
          types,priceLevel,regularOpeningHours
  ```
- **Exclude expensive Enterprise/Atmosphere fields**: userRatingCount, editorialSummary, dineIn, outdoorSeating, etc.
- Return 4 places with rich data (up to 4 photos each, reviews)
- For A/B comparison questions: Return 2 places only
- Always include available search functionality in response

**`POST /api/onboarding/submit-answer`**

- Input: userId, category, selectedData
  - For multi-select: selectedPlaceIds[]
  - For A/B comparison: { placeAId, placeBId, sliderValue (1-10) }
- Fetch place details for selected places (using Pro SKU fields only)
- Call OpenAI to update BIO:
  - Analyze place attributes, reviews, types
  - For A/B: Use slider value as preference strength signal
  - Update category preferences
  - Calculate confidence score
  - Determine next question type and direction
- Check stop conditions
- If continue: 
  - Decide next question type (multi-select vs A/B comparison)
  - Generate next dynamic message (never reflect back what was learned)
- Return: updated confidence, nextMessage, questionType, shouldContinue

**`POST /api/onboarding/search-place`**

- Input: userId, query, category (for filtering)
- Google Places autocomplete constrained to residential area
- Return place details with photos/reviews for card display (Pro SKU fields only)
- Allow selection from search results

**`POST /api/onboarding/complete`**

- Finalize BIO (mark as ready)
- Mark onboarding as complete
- Return success (no BIO in response - keep it hidden)

### 3.2 BIO Management APIs (Hidden from Main UI)

**`POST /api/bio/update`**

- Input: userId, newInformation (e.g., from place rating)
- Update BIO using OpenAI
- Increment version
- Store in user-bios table
- Return success (not the BIO itself)

**`GET /api/profile/bio`**

- Only accessible from profile page
- User must explicitly request to view
- Return user's current BIO in readable format
- Include confidence scores per category

**`POST /api/bio/generate-search-context`**

- Input: userId, category, destination
- Fetch BIO internally
- Generate search keywords/filters from BIO
- Return optimized Google Places query parameters
- Never expose raw BIO in response

### 3.3 Search APIs

**`POST /api/search/personalized`**

- Input: userId, destination, category, additionalFilters (optional)
- Internally fetch user BIO
- Generate search query using OpenAI + BIO
- Query Google Places API (New) with photos + reviews
- Fetch advanced fields (Atmosphere, Accessibility) if premium:
  - Free tier: Pro SKU fields only
  - Premium: Add Enterprise + Atmosphere fields
- Score based on BIO alignment
- Return results with rich cards (4 photos, reviews, AI explanation)
- Explanation phrased naturally, no BIO mentioned: "Perfect for you because it has X and Y"

**`POST /api/search/generate-query`**

- Input: userId, destination, category
- Internal API - converts BIO to Google Places query
- Returns: keywords, includedTypes, filterFields (dineIn, outdoorSeating, etc.)

### 3.4 Place Interaction APIs

**`POST /api/places/save`**

- Save place to user's collection
- Return place data for dropdown display

**`POST /api/places/rate`**

- Input: placeId, rating (1-5), optional notes
- Update saved place rating
- Trigger BIO update in background (async)
- Return success message: "Thanks! This helps us improve your recommendations"

**`GET /api/places/saved`**

- Return user's saved places
- Format for dropdown display: name, category, rating, thumbnail
- Include remove/rate actions in response format

**`DELETE /api/places/saved/:placeId`**

- Remove saved place
- Return updated list

## Phase 4: Main Application UI

### 4.1 Home Page Layout (Post-Onboarding)

**Route**: `/`

**Layout**: Map-dominant (Loca-style)

- **Map**: 85-90% of screen (Google Map)
- **Top bar** (floating over map):
  - Logo (left)
  - Search: Destination input + Category dropdown
  - "Refine" button (opens filter modal for Google Places attributes)
  - User menu (right): Saved places dropdown, Profile, Sign out
- **Results**: Slide-in panel from bottom (mobile) or left sidebar (desktop)

### 4.2 Search Interface

**Top Bar Components**:

- **Destination input**: Google Places autocomplete (cities/areas)
- **Category dropdown**: Select from Google Places types (grouped):
  - Coffee & Cafes
  - Restaurants
  - Bars & Nightlife
  - Museums & Culture
  - Shopping
  - etc.
- **"Refine" button**: Opens modal with Google Places boolean filters
  - Based on [available data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields):
  - Dine-in, Takeout, Delivery, Reservable
  - Outdoor seating, Dog friendly, Good for groups, Good for children
  - Live music, Serves vegetarian food
  - Accessible (wheelchair)
  - etc.
- **"Use my preferences" toggle**: Default ON (uses BIO), turn OFF for generic search

### 4.3 Saved Places Dropdown (Loca-style)

**Component**: Dropdown from top bar

**Design**:

- Click "Saved" in top bar → dropdown opens
- Compact list view:
  - Thumbnail, name, category icon, rating stars
  - Hover actions: **Rate (modal)**, Remove (confirm), View on map
- Group by category (collapsible sections)
- Search/filter within saved places
- "Export to Google Maps" button at bottom
- Max height with scroll

**Rate Modal** (compact) - **ONLY accessible from saved dropdown**:

- Place name + thumbnail
- 5-star selector
- Optional notes field (1-2 sentences)
- "Save rating" → Updates BIO in background, shows subtle success toast
- **Note**: Rating is ONLY available for saved places, not from main results

### 4.4 Results Display

**Mobile View** (Loca-style):

- **Toggle button**: Switch between List view and Map view
- **Adjustable split**: Draggable divider to customize map/list visibility ratio
- Users can swipe or drag to adjust how much screen space each section occupies
- Toggle states: List-only, Map-only, or Split view (50/50, 70/30, etc.)

**Rich Result Cards** (elsebrew-style):

- 4 photos (2x2 grid or carousel)
- Place name, rating, review count (if premium - Enterprise SKU)
- Address (truncated)
- AI explanation (BIO-based but subtle): "Great match - features you love like X and Y"
- Quick info tags: Price level, key attributes
- "Save" button (heart icon) - **NO rate button here**
- Click to expand: Details drawer

### 4.5 Details Drawer (slide-in)

- Photo gallery (all photos)
- Name, rating, reviews
- Google Place attributes (from data fields)
- Map embed (location)
- "Save" button (heart icon)
- **NO rate button** - rating only available from saved dropdown
- "Get directions" (Google Maps link)

### 4.6 Profile Page - BIO Access (Voluntary)

**Route**: `/profile`

**Layout**:

- User info section (name, email, residential place)
- **"View my taste profile"** button (collapsed by default)
  - Click to expand → Shows BIO in readable format
  - Per-category preferences
  - Confidence scores
  - "How we learn your taste" explanation
- **"Refine a category"** button → Re-do onboarding for specific category
- Saved places count (link to saved dropdown)
- Search history (if implemented)
- Subscription management
- Account settings

**Key Principle**: User must actively choose to see BIO - it's never pushed to them

## Phase 5: Monetization - Hotel Promotions

### 5.1 Ad Integration System

**Booking.com Affiliate Integration**:

- Register for Booking.com affiliate program
- Get affiliate ID and API access
- Track conversions via unique referral links

### 5.2 Personalized Hotel Recommendations

**`POST /api/ads/hotel-recommendation`**

- Input: userId, destination, dates (optional)
- Internally fetch user BIO
- Query Booking.com API for hotels
- Use OpenAI to match hotels to BIO
- Return top 1-2 hotels with explanation

### 5.3 UI for Promoted Content

**Results Page** (first slot):

- Card labeled "Personalized Stay Recommendation"
- Visual distinction (subtle border, "Sponsored" badge)
- Hotel photos (4), name, rating
- **Explanation** (BIO-aligned but doesn't mention BIO):
  - "Based on your preferences, this hotel offers [features you love]"
  - Natural phrasing, not algorithmic
- Price, availability
- "View details" → affiliate link to Booking.com
- **Transparency**: "This is a sponsored recommendation that we believe matches your taste"

**Tracking**:

- Log impressions, clicks, conversions
- A/B test messaging
- Optimize matching algorithm

## Phase 6: Backend Infrastructure

### 6.1 Paddle Subscription System (Apple Pay + Google Pay)

- New implementation with Paddle SDK
- Create `lib/paddle.ts` for Paddle client initialization
- Create `lib/subscription.ts` for subscription logic
- Subscription tiers:
  - **Free**: 10 searches/12h, Pro SKU fields only
  - **Premium**: Unlimited searches, Enterprise + Atmosphere fields, hotel ads first
  - **Pay-as-you-go**: $0.15 per search with advanced fields
- **Payment Methods**: Apple Pay, Google Pay, Credit Cards via Paddle
- **Webhooks**: Handle subscription events (subscription.created, subscription.updated, subscription.canceled, payment.failed)
- **Customer Portal**: Paddle's built-in customer portal for managing subscriptions
- **Why Paddle**: Supports Israeli merchant accounts (Stripe doesn't) + native Apple Pay/Google Pay recurring payments

### 6.2 Rate Limiting

- Port tier-based rate limiting
- Track searches per user
- Monthly billing for PAYG users

### 6.3 Place Caching

- Cache Google Places responses (with photos + reviews)
- TTL: 7 days for search results, 30 days for onboarding selections
- Dramatically reduce API costs

### 6.4 Email System

- Email templates (no BIO mentions in emails)
- Welcome email
- Invoices for PAYG (Paddle automatically sends receipts and invoices)
- Optional: "We've learned more about your taste" (very subtle)
- Integration with Paddle's email system for payment notifications
- Paddle handles VAT and tax compliance automatically

## Phase 7: Implementation Todos

### Setup & Infrastructure

1. Initialize Next.js project with TypeScript, Tailwind, no emoji presets
2. Create DynamoDB tables (users, bios, preferences, saved-places, onboarding-sessions, messages, subscriptions)
3. Configure Google OAuth + manual auth
4. Set up Paddle integration (enable Apple Pay + Google Pay) - register as Israeli merchant
5. Research Google Places types exhaustively from official documentation

### Onboarding System

6. Build signup flow (Google + manual, residential place autocomplete)
7. Build category selection UI (Google Places type cards, no emojis)
8. Create dynamic message template system with database
9. Build rich place card component (up to 4 photos, reviews, description - Pro SKU only)
10. Build A/B comparison component (2 places + 1-10 slider, no ticks)
11. Implement iterative discovery flow with persistent search bar
12. Build OpenAI BIO update logic (handle both multi-select and A/B comparison inputs)
13. Implement question type selection algorithm (when to use multi-select vs A/B)
14. Implement stop condition algorithms
15. Build completion page (simple, no BIO display)

### Core Search

16. Build main UI (map-dominant, floating search bar)
17. Build category dropdown with Google Places types
18. Build refine modal with Google Places boolean filters
19. Implement BIO-driven search query generation (hidden from user)
20. Build rich results display (elsebrew-style cards - NO rate button)
21. **Build mobile list/map toggle with adjustable split (draggable divider)**
22. Implement details drawer (NO rate button)
23. Add map markers and interactions
24. Implement tier-based field selection (Pro SKU for free, Enterprise+ for premium)

### User Features

25. Build saved places dropdown (Loca-style, compact)
26. **Implement rating modal (ONLY from saved dropdown, with BIO update in background)**
27. Build profile page with voluntary BIO access
28. Implement category refinement (re-do onboarding for one category)
29. Add export to Google Maps
30. Build search history feature (optional)

### Monetization

31. Integrate Booking.com affiliate API
32. Build hotel recommendation system (BIO-driven)
33. Implement sponsored result card (first slot)
34. Set up conversion tracking
35. A/B test explanation messaging

### Backend Services

36. **Implement Paddle subscription system (Apple Pay + Google Pay)**
37. Build Paddle webhook handlers (subscription.created, subscription.updated, subscription.canceled, payment.failed, etc.)
38. Create Paddle checkout flow with Apple Pay + Google Pay buttons
39. Implement tier-based rate limiting
40. Set up place caching with photos + reviews (30d onboarding, 7d search)
41. Configure email system (subtle, no BIO mentions) - integrate with Paddle emails
42. Build analytics and monitoring
43. Implement background BIO update service (for ratings from saved dropdown)

## Key Principles

### BIO Subtlety

- **Never mention "BIO" in user-facing UI**
- Use natural language: "based on your preferences", "you seem to enjoy", "perfect for you"
- BIO only visible in profile, by user's choice
- Updates happen silently in background
- Explanations feel helpful, not algorithmic

### No Pattern Reflection

- **Critical**: Never say "You picked X, let's see if you prefer Y"
- Never say "You seem to like X"
- Never say "Based on your previous choices"
- Keep messages neutral and forward-looking
- Examples: "Here are some options", "Between these two?", "How about these?"

### Dynamic Onboarding

- Message templates randomized from database pool
- Never same pattern twice
- Conversational, engaging, not repetitive
- Track message usage to ensure variety
- Two question types (multi-select and A/B comparison) for variety

### Professional Design

- No emojis anywhere (use clean icons, imagery instead)
- Loca-style map dominance
- Elsebrew-style rich cards (photos, reviews)
- Subtle, tasteful animations (Framer Motion)

### Cost Optimization

**Onboarding** (minimize costs):
- Use **Pro SKU + Essentials only**
- Field mask: `displayName,photos,reviews,rating,formattedAddress,types,priceLevel,regularOpeningHours`
- **Avoid**: `userRatingCount` (Enterprise), `editorialSummary` (Enterprise), atmosphere fields (Enterprise + Atmosphere)
- 30-day cache TTL (users rarely re-do onboarding)

**Main Search** (tier-based):
- **Free tier**: Pro SKU fields only (same as onboarding)
- **Premium tier**: Add Enterprise + Atmosphere fields
  - `userRatingCount`, `websiteUri`, `dineIn`, `takeout`, `outdoorSeating`, `servesCoffee`, `allowsDogs`, `goodForGroups`, `servesBreakfast`, `servesBrunch`, `accessibilityOptions`
- 7-day cache TTL (fresher data needed)

### Google Places Integration

- Use official [place types from documentation](https://developers.google.com/maps/documentation/places/web-service/data-fields)
- See [SKU pricing details](https://developers.google.com/maps/documentation/places/web-service/data-fields) for field costs
- Cache aggressively to minimize costs
- Use place-cache DynamoDB table with TTL

## Success Metrics

- Onboarding completion rate
- Average questions per category before stop condition
- BIO confidence scores by category
- Search-to-save conversion rate
- Profile/BIO view rate (measure curiosity)
- User retention (7-day, 30-day)
- Saved place rating rate (engagement)
- Hotel ad click-through rate
- Booking conversion rate
- Revenue per user
- Cost per search (Google Places API costs)
- Cache hit rate

## Next Steps

1. Get approval on refined plan
2. Set up project repository in new directory `loca-2.0/`
3. Create design mockups:
   - No emojis, Loca-style layout, elsebrew-style cards
   - Mobile list/map toggle with adjustable split
   - Saved dropdown with rate modal (only place to rate)
4. Write 50+ dynamic message templates (no pattern reflection)
5. Map out all Google Places types to categories from official documentation
6. Write OpenAI prompts for BIO generation (handle both multi-select and A/B inputs)
7. Set up Paddle account (Israeli merchant) and enable Apple Pay + Google Pay
8. Create Paddle subscription plans (Free, Premium, PAYG)
9. Begin with authentication + onboarding MVP
9. Test cost optimization strategy with real API calls
10. Implement caching strategy
11. Launch beta with select users

## Key Implementation Changes

### Paddle vs PayPal/Stripe

**Why Paddle**:
- ✅ **Supports Israeli merchant accounts** (Stripe doesn't)
- ✅ Native Apple Pay + Google Pay support for recurring subscriptions
- ✅ Better recurring subscription API than PayPal
- ✅ Excellent Next.js SDK and webhook system
- ✅ Customer portal built-in
- ✅ Automatic VAT/tax compliance
- ✅ Invoice generation built-in
- ✅ More modern developer experience

**Migration from elsebrew PayPal code**:
- Replace `lib/paypal.ts` with `lib/paddle.ts`
- Update subscription webhook handlers (similar structure)
- Keep same tier logic (Free, Premium, PAYG)
- Paddle provides better invoice/receipt system automatically

**Paddle Setup Steps**:
1. Register as Israeli merchant on Paddle
2. Create subscription plans in Paddle dashboard
3. Enable Apple Pay + Google Pay in Paddle settings
4. Set up webhook endpoints
5. Install `@paddle/paddle-js` npm package
6. Implement Paddle checkout overlay

### Mobile UX Enhancement

**List/Map Toggle with Adjustable Split**:
- Implement draggable divider component (like React Split Pane)
- Persist user's preferred split ratio in localStorage
- Smooth animations with Framer Motion
- Touch-friendly drag handles for mobile
- Snap points at 0%, 50%, 100% for quick switching

### Rating Restriction

**Why only from saved dropdown**:
- Ensures users only rate places they've actually saved/visited
- Reduces frivolous ratings
- Makes rating more intentional and thoughtful
- BIO updates are more meaningful from saved places
- Cleaner UI - no rate buttons cluttering results

**Implementation**:
- Remove all rate buttons from result cards and details drawer
- Add prominent rate option in saved places dropdown
- Show rating history in profile
- Trigger BIO update async when rating submitted

