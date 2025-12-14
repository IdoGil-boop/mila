'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaceCategory, OnboardingPlaceCard } from '@/types';
import { getCategoryInfo } from '@/lib/categories';

interface PlaceAutocompleteProps {
  category: PlaceCategory;
  location: { lat: number; lng: number };
  onPlaceSelect: (place: OnboardingPlaceCard) => void;
  excludedPlaceIds?: Set<string>;
}

export default function PlaceAutocomplete({
  category,
  location,
  onPlaceSelect,
  excludedPlaceIds = new Set(),
}: PlaceAutocompleteProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; description: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const categoryInfo = getCategoryInfo(category);
  // Use only valid primary types from Google Places API (New) documentation
  // Valid primary types are those listed in Table A that can be used in requests
  // Reference: https://developers.google.com/maps/documentation/places/web-service/place-types
  // Memoize to prevent infinite loops - only recalculate when category changes
  // IMPORTANT: Google Places API limits includedPrimaryTypes to maximum 5 values
  const primaryTypes = useMemo(() => {
    // Start with the category's defined googleTypes (these should already be valid primary types)
    let types = categoryInfo?.googleTypes || [category];
    
    // Add related valid primary types for coffee-related categories to improve matching
    // Valid Food and Drink primary types: restaurant, cafe, bar, bakery, meal_takeaway, meal_delivery
    // Note: 'food_store' is NOT a valid primary type for requests (even though some places have it)
    // Note: 'store' is valid for Shopping category, but not for Food and Drink
    if (category === 'cafe' || category === 'coffee_shop') {
      // Only add valid Food and Drink primary types
      const validRelatedTypes = ['cafe', 'coffee_shop', 'restaurant', 'bakery'];
      // Merge with existing types, keeping only valid ones
      types = Array.from(new Set([...types, ...validRelatedTypes]));
    }
    
    // Limit to 5 types (Google Places API maximum for includedPrimaryTypes)
    // The category definitions should already contain valid primary types
    return types.slice(0, 5);
  }, [category]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (input.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:68',message:'Autocomplete request starting',data:{input:input.trim(),primaryTypes,category,locationLat:location?.lat,locationLng:location?.lng,hasLocation:!!location},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      try {
        const requestBody = {
          input: input.trim(),
          includedPrimaryTypes: primaryTypes,
          locationBias: {
            lat: location.lat,
            lng: location.lng,
            radius: 5000,
          },
        };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:52',message:'Request body prepared',data:{requestBody,primaryTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        const response = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        let data = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:81',message:'API response received (with types)',data:{success:data.success,suggestionsCount:data.suggestions?.length,suggestions:data.suggestions?.slice(0,3).map((s: { placeId: string; description: string })=>({description:s.description,placeId:s.placeId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        // If no results with type filtering, try without type filter (fallback)
        if (data.success && (!data.suggestions || data.suggestions.length === 0)) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:98',message:'No results with types, trying without type filter',data:{input:input.trim(),originalSuggestionsCount:data.suggestions?.length,excludedPlaceIdsCount:excludedPlaceIds.size,excludedPlaceIds:Array.from(excludedPlaceIds).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
          const fallbackBody = {
            input: input.trim(),
            locationBias: {
              lat: location.lat,
              lng: location.lng,
              radius: 5000,
            },
          };
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:110',message:'Fallback request body',data:{fallbackBody},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
          const fallbackResponse = await fetch('/api/places/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody),
          });
          data = await fallbackResponse.json();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:119',message:'API response received (without types)',data:{success:data.success,suggestionsCount:data.suggestions?.length,allSuggestions:data.suggestions?.map((s: { placeId: string; description: string })=>({description:s.description,placeId:s.placeId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
        }
        
        if (data.success) {
          // Filter out excluded places
          const beforeFilter = data.suggestions || [];
          const filtered = beforeFilter.filter(
            (s: { placeId: string; description: string }) => !excludedPlaceIds.has(s.placeId)
          );
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:125',message:'Suggestions filtered',data:{beforeFilterCount:beforeFilter.length,filteredCount:filtered.length,excludedPlaceIdsCount:excludedPlaceIds.size,allBeforeFilter:beforeFilter.map((s: { placeId: string; description: string })=>({description:s.description,placeId:s.placeId})),allFiltered:filtered.map((s: { placeId: string; description: string })=>({description:s.description,placeId:s.placeId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/onboarding/PlaceAutocomplete.tsx:131',message:'API request failed',data:{success:data.success,error:data.error,input:input.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        console.error('Error fetching autocomplete:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [input, location, primaryTypes, excludedPlaceIds]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (placeId: string, description: string) => {
    setInput('');
    setShowSuggestions(false);
    
    // Fetch place details to create OnboardingPlaceCard
    try {
      const response = await fetch(`/api/places/${placeId}`);
      const data = await response.json();
      
      if (data.success && data.place) {
        const place = data.place;
        // Transform PlaceBasicInfo to OnboardingPlaceCard
        const placeCard: OnboardingPlaceCard = {
          placeId: place.id || placeId,
          name: place.displayName || description,
          address: place.formattedAddress || '',
          rating: place.rating || 0,
          photos: (place.photos || []).slice(0, 4), // Limit to 4 photos
          description: undefined, // Will be populated if reviews are available
          reviews: [], // Reviews need to be fetched separately if needed
          types: place.types || [],
          priceLevel: place.priceLevel,
          regularOpeningHours: place.regularOpeningHours ? {
            openNow: place.regularOpeningHours.openNow,
            weekdayText: place.regularOpeningHours.weekdayText,
          } : undefined,
        };
        
        onPlaceSelect(placeCard);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-espresso/20 rounded-lg focus-within:border-espresso focus-within:ring-2 focus-within:ring-espresso/20 transition-all">
          <Plus className="w-5 h-5 text-espresso flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={`Add a ${categoryInfo?.name.toLowerCase() || category}...`}
            className="flex-1 outline-none text-charcoal placeholder-espresso/50 bg-transparent text-base font-medium"
          />
          {loading && (
            <Loader2 className="w-5 h-5 text-espresso animate-spin flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-espresso/20 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                onClick={() => handleSelect(suggestion.placeId, suggestion.description)}
                className="w-full text-left px-4 py-3 text-sm font-medium text-charcoal hover:bg-offwhite transition-colors border-b border-espresso/10 last:border-b-0 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-espresso flex-shrink-0" />
                <span>{suggestion.description}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

