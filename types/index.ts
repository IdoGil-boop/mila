// Google Places types - from official API documentation
export type PlaceCategory =
  | 'cafe'
  | 'coffee_shop'
  | 'restaurant'
  | 'bar'
  | 'night_club'
  | 'museum'
  | 'art_gallery'
  | 'park'
  | 'tourist_attraction'
  | 'store'
  | 'shopping_mall'
  | 'clothing_store'
  | 'book_store'
  | 'movie_theater'
  | 'library'
  | 'bakery'
  | 'gym'
  | 'spa'
  | string; // 100+ more types available

export interface UserBIO {
  userId: string;
  version: number;
  bioText: string; // Internal natural language description
  categories: {
    [category: string]: {
      keywords: string[];
      preferredAttributes: string[]; // e.g., ["outdoor seating", "dog friendly"]
      stylePreferences: string; // e.g., "minimalist Norwegian design"
      confidenceScore: number; // 0-1
    };
  };
  lastUpdated: string;
  // Note: BIO not shown to user by default, only in profile if they click
}

export interface OnboardingPlaceCard {
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
  priceLevel?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
}

export interface ABComparison {
  placeA: OnboardingPlaceCard;
  placeB: OnboardingPlaceCard;
  sliderValue: number; // 1-10 (1=strongly prefer A, 10=strongly prefer B, 5=neutral)
}

export interface DynamicMessage {
  id: string;
  type: 'welcome' | 'category_intro' | 'question' | 'transition' | 'completion';
  templates: string[]; // Multiple variations to randomize
  variables: string[]; // Placeholders like {category}, {city}
}

export type SubscriptionTier = 'free' | 'premium' | 'pay_as_you_go';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  paddlePlanId?: string;
  currentPeriodEnd?: string; // ISO timestamp
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  dob?: string;
  residentialPlace?: string;
  residentialPlaceId?: string;
  subscription: SubscriptionInfo;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlace {
  userId: string;
  placeId: string;
  placeName: string;
  category: PlaceCategory;
  rating?: number; // 1-5, only if user rated
  visitedAt?: string;
  savedAt: string;
  notes?: string;
  // Cached place data
  address?: string;
  photos?: string[];
  types?: string[];
}

export interface OnboardingSession {
  userId: string;
  currentStep: 'signup' | 'categories' | 'discover' | 'complete';
  currentCategory?: PlaceCategory;
  questionsAsked: number;
  completed: boolean;
  lastActive: string;
  selectedCategories?: PlaceCategory[];
}

export interface PlaceBasicInfo {
  id: string;
  displayName: string;
  formattedAddress?: string;
  location?: {
    lat: number;
    lng: number;
  };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number; // Enterprise SKU - only for premium
  priceLevel?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  photos?: string[];
  // Enterprise + Atmosphere fields (premium only)
  websiteUri?: string;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  outdoorSeating?: boolean;
  servesCoffee?: boolean;
  allowsDogs?: boolean;
  goodForGroups?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesVegetarianFood?: boolean;
  accessibilityOptions?: any;
}

export interface SearchResult {
  place: PlaceBasicInfo;
  score: number;
  reasoning?: string; // BIO-based explanation: "Perfect for you because it has X and Y"
  matchedKeywords: string[];
}

export interface SearchParams {
  destination: string;
  destinationPlaceId?: string;
  category: PlaceCategory;
  additionalFilters?: {
    [key: string]: boolean;
  };
  usePreferences?: boolean; // Default true - uses BIO
}

