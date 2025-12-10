'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Filter, ChevronDown } from 'lucide-react';
import { PlaceCategory } from '@/types';
import FiltersDropdown from './FiltersDropdown';

interface SearchBarProps {
  onSearch: (destination: string, destinationPlaceId: string, category: PlaceCategory) => void;
  onOpenFilters: () => void;
  onApplyFilters?: (filters: Record<string, boolean>) => void;
  currentFilters?: Record<string, boolean>;
}

const CATEGORIES = [
  { id: 'cafe', name: 'Cafes' },
  { id: 'coffee_shop', name: 'Coffee Shops' },
  { id: 'restaurant', name: 'Restaurants' },
  { id: 'bar', name: 'Bars' },
  { id: 'night_club', name: 'Nightlife' },
  { id: 'museum', name: 'Museums' },
  { id: 'art_gallery', name: 'Galleries' },
  { id: 'park', name: 'Parks' },
  { id: 'tourist_attraction', name: 'Attractions' },
  { id: 'store', name: 'Shopping' },
  { id: 'movie_theater', name: 'Entertainment' },
  { id: 'library', name: 'Libraries' },
  { id: 'bakery', name: 'Bakeries' },
  { id: 'gym', name: 'Fitness' },
  { id: 'spa', name: 'Wellness' },
];

export default function SearchBar({ onSearch, onOpenFilters, onApplyFilters, currentFilters = {} }: SearchBarProps) {
  const [destination, setDestination] = useState('');
  const [destinationPlaceId, setDestinationPlaceId] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('cafe');
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (!destination || !category) {
      return;
    }
    onSearch(destination, destinationPlaceId, category);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const activeFilterCount = Object.values(currentFilters).filter(Boolean).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(event.target as Node)) {
        setShowFiltersDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white shadow-2xl border border-espresso/20 rounded-xl">
      {/* Main search row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4">
        {/* Destination input */}
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-offwhite border border-espresso/20 rounded-lg focus-within:border-espresso focus-within:ring-2 focus-within:ring-espresso/20 transition-all h-[42px]">
          <MapPin className="w-4 h-4 text-espresso flex-shrink-0" />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onFocus={() => setShowDestinationSuggestions(true)}
            onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
            onKeyPress={handleKeyPress}
            placeholder="Where do you want to explore?"
            className="flex-1 outline-none text-charcoal placeholder-espresso/50 bg-transparent text-sm font-medium h-full"
          />
        </div>

        {/* Category and buttons row */}
        <div className="flex items-center gap-2">
          {/* Category dropdown */}
          <div className="relative flex-1 sm:flex-none" ref={categoryDropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full sm:w-auto px-4 py-2.5 bg-offwhite border border-espresso/20 rounded-lg hover:border-espresso/40 transition-all flex items-center justify-between gap-2 text-charcoal text-sm font-medium h-[42px]"
            >
              <span className="truncate">{CATEGORIES.find(c => c.id === category)?.name || 'Select category'}</span>
              <ChevronDown className={`w-4 h-4 text-espresso flex-shrink-0 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-espresso/20 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-full">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id as PlaceCategory);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap block ${
                      category === cat.id
                        ? 'bg-offwhite text-espresso'
                        : 'text-charcoal hover:bg-offwhite'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!destination || !category}
            className="px-4 py-2.5 bg-espresso-light text-white font-semibold hover:bg-espresso disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 rounded-lg h-[42px]"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {/* Filters button */}
          <div className="relative" ref={filtersDropdownRef}>
            <button
              onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
              className={`px-3 py-2.5 border-2 rounded-lg transition-all relative h-[42px] flex items-center justify-center ${
                activeFilterCount > 0
                  ? 'border-espresso-light bg-espresso-light/10'
                  : 'border-espresso/20 hover:border-espresso/40 hover:bg-offwhite'
              }`}
              title="Filters"
            >
              <Filter className="w-4 h-4 text-espresso" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-espresso-light text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFiltersDropdown && (
              <FiltersDropdown
                currentFilters={currentFilters}
                onApply={(filters) => {
                  onApplyFilters?.(filters);
                  setShowFiltersDropdown(false);
                }}
                onClose={() => setShowFiltersDropdown(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Use preferences toggle */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="use-preferences"
          defaultChecked
          className="w-4 h-4 text-espresso border-espresso/30 rounded focus:ring-espresso"
        />
        <label htmlFor="use-preferences" className="text-sm text-espresso cursor-pointer font-medium">
          Use AI preferences
        </label>
      </div>
    </div>
  );
}
