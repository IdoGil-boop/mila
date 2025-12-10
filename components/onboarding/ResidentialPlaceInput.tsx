'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResidentialPlaceInputProps {
  onSelect: (placeId: string, description: string) => void;
  initialValue?: string;
  locationBias?: { lat: number; lng: number };
}

export default function ResidentialPlaceInput({
  onSelect,
  initialValue = '',
  locationBias,
}: ResidentialPlaceInputProps) {
  const [input, setInput] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; description: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        () => {
          setLocationLoading(false);
        }
      );
    }
  }, []);

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
      try {
        const response = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: input.trim(),
            types: ['locality', 'administrative_area_level_1'],
            locationBias: locationBias || currentLocation,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching autocomplete:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [input, currentLocation, locationBias]);

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

  const handleSelect = (placeId: string, description: string) => {
    setInput(description);
    setShowSuggestions(false);
    onSelect(placeId, description);
  };

  const handleUseCurrentLocation = async () => {
    if (!currentLocation) {
      // Try to get location again
      if (navigator.geolocation) {
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setCurrentLocation(loc);
            await reverseGeocode(loc);
            setLocationLoading(false);
          },
          () => {
            setLocationLoading(false);
          }
        );
      }
      return;
    }

    await reverseGeocode(currentLocation);
  };

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    setLocationLoading(true);
    try {
      const response = await fetch('/api/places/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
        }),
      });

      const data = await response.json();
      if (data.success && data.place) {
        // Auto-select the detected location
        handleSelect(data.place.placeId, data.place.description);
      } else {
        // Fallback: focus input and let user type
        inputRef.current?.focus();
        setInput('');
      }
    } catch (error) {
      console.error('Error using current location:', error);
      // Fallback: focus input
      inputRef.current?.focus();
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-espresso/20 rounded-lg focus-within:border-espresso focus-within:ring-2 focus-within:ring-espresso/20 transition-all">
          <MapPin className="w-5 h-5 text-espresso flex-shrink-0" />
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
            placeholder="Enter your city or area"
            className="flex-1 outline-none text-charcoal placeholder-espresso/50 bg-transparent text-base font-medium"
          />
          {loading && (
            <Loader2 className="w-5 h-5 text-espresso animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Current location button */}
        {!input && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleUseCurrentLocation}
            disabled={locationLoading}
            className="mt-2 w-full px-4 py-2 text-sm text-espresso hover:bg-offwhite border border-espresso/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {locationLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Detecting location...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span>Use my current location</span>
              </>
            )}
          </motion.button>
        )}
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

