import { PlaceCategory } from '@/types';
import {
  Coffee,
  UtensilsCrossed,
  Beer,
  Building2,
  Palette,
  TreePine,
  Landmark,
  ShoppingBag,
  Popcorn,
  BookOpen,
  Croissant,
  Dumbbell,
  Sparkles,
} from 'lucide-react';

export interface CategoryInfo {
  id: PlaceCategory;
  name: string;
  icon: any; // Lucide icon component
  googleTypes: string[]; // Google Places API types
  description: string;
}

export const CATEGORY_DEFINITIONS: CategoryInfo[] = [
  {
    id: 'cafe',
    name: 'Cafes',
    icon: Coffee,
    googleTypes: ['cafe'],
    description: 'Coffee houses and casual cafes',
  },
  {
    id: 'coffee_shop',
    name: 'Coffee Shops',
    icon: Coffee,
    googleTypes: ['coffee_shop'],
    description: 'Specialty coffee and espresso bars',
  },
  {
    id: 'restaurant',
    name: 'Restaurants',
    icon: UtensilsCrossed,
    googleTypes: ['restaurant'],
    description: 'Dining establishments',
  },
  {
    id: 'bar',
    name: 'Bars',
    icon: Beer,
    googleTypes: ['bar'],
    description: 'Bars and pubs',
  },
  {
    id: 'night_club',
    name: 'Nightlife',
    icon: Sparkles,
    googleTypes: ['night_club'],
    description: 'Nightclubs and entertainment venues',
  },
  {
    id: 'museum',
    name: 'Museums',
    icon: Building2,
    googleTypes: ['museum'],
    description: 'Museums and cultural institutions',
  },
  {
    id: 'art_gallery',
    name: 'Art Galleries',
    icon: Palette,
    googleTypes: ['art_gallery'],
    description: 'Art galleries and exhibitions',
  },
  {
    id: 'park',
    name: 'Parks',
    icon: TreePine,
    googleTypes: ['park'],
    description: 'Parks and green spaces',
  },
  {
    id: 'tourist_attraction',
    name: 'Attractions',
    icon: Landmark,
    googleTypes: ['tourist_attraction'],
    description: 'Tourist attractions and landmarks',
  },
  {
    id: 'store',
    name: 'Shopping',
    icon: ShoppingBag,
    googleTypes: ['store', 'shopping_mall', 'clothing_store', 'book_store'],
    description: 'Retail stores and shopping',
  },
  {
    id: 'movie_theater',
    name: 'Entertainment',
    icon: Popcorn,
    googleTypes: ['movie_theater', 'bowling_alley', 'amusement_park'],
    description: 'Entertainment venues',
  },
  {
    id: 'library',
    name: 'Libraries',
    icon: BookOpen,
    googleTypes: ['library'],
    description: 'Public libraries',
  },
  {
    id: 'bakery',
    name: 'Bakeries',
    icon: Croissant,
    googleTypes: ['bakery'],
    description: 'Bakeries and pastry shops',
  },
  {
    id: 'gym',
    name: 'Fitness',
    icon: Dumbbell,
    googleTypes: ['gym'],
    description: 'Gyms and fitness centers',
  },
  {
    id: 'spa',
    name: 'Wellness',
    icon: Sparkles,
    googleTypes: ['spa'],
    description: 'Spas and wellness centers',
  },
];

export function getCategoryInfo(categoryId: PlaceCategory): CategoryInfo | undefined {
  return CATEGORY_DEFINITIONS.find((cat) => cat.id === categoryId);
}

export function getCategoryIcon(categoryId: PlaceCategory) {
  const category = getCategoryInfo(categoryId);
  return category?.icon;
}

export function getCategoryName(categoryId: PlaceCategory): string {
  const category = getCategoryInfo(categoryId);
  return category?.name || categoryId;
}
