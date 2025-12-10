'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, DollarSign, Heart, ExternalLink, Clock } from 'lucide-react';
import { SearchResult } from '@/types';

interface ResultCardProps {
  result: SearchResult;
  onSave: (placeId: string) => void;
  onViewDetails: (placeId: string) => void;
  saved?: boolean;
}

export default function ResultCard({ result, onSave, onViewDetails, saved = false }: ResultCardProps) {
  const { place, reasoning } = result;
  const [isSaved, setIsSaved] = useState(saved);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave(place.id);
  };

  return (
    <div
      className="bg-white border border-espresso/10 hover:border-espresso/30 hover:shadow-md transition-all cursor-pointer flex gap-3 p-3 rounded-lg group"
      onClick={() => onViewDetails(place.id)}
    >
      {/* Photo thumbnail */}
      {place.photos && place.photos.length > 0 && (
        <div className="relative w-24 h-24 flex-shrink-0">
          <img
            src={place.photos[0]}
            alt={place.displayName}
            className="w-full h-full object-cover rounded-lg"
          />
          {/* Save button overlay */}
          <button
            onClick={handleSave}
            className="absolute top-1.5 right-1.5 w-7 h-7 bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all rounded-md"
          >
            <Heart
              className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-gray-500'}`}
            />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Name and rating */}
        <div>
          <h3 className="font-semibold text-gray-900 text-base truncate">{place.displayName}</h3>
          <div className="flex items-center gap-2 text-xs mt-1">
            {place.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{place.rating.toFixed(1)}</span>
                {place.userRatingCount && (
                  <span className="text-gray-500">({place.userRatingCount})</span>
                )}
              </div>
            )}
            {place.priceLevel && (
              <div className="flex items-center text-gray-600">
                {Array.from({ length: place.priceLevel }).map((_, i) => (
                  <DollarSign key={i} className="w-2.5 h-2.5" />
                ))}
              </div>
            )}
            {place.regularOpeningHours?.openNow !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full ${
                  place.regularOpeningHours.openNow
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {place.regularOpeningHours.openNow ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
        </div>

        {/* Address */}
        {place.formattedAddress && (
          <p className="text-xs text-gray-600 truncate">{place.formattedAddress}</p>
        )}

        {/* AI Explanation */}
        {reasoning && (
          <div className="bg-offwhite px-2 py-1.5 rounded-md border border-espresso/10">
            <p className="text-xs text-espresso line-clamp-2 font-medium leading-relaxed">{reasoning}</p>
          </div>
        )}

        {/* Attributes */}
        {(place.outdoorSeating || place.allowsDogs || place.servesBreakfast || place.servesCoffee) && (
          <div className="flex flex-wrap gap-1">
            {place.outdoorSeating && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
                Outdoor
              </span>
            )}
            {place.allowsDogs && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
                Dog friendly
              </span>
            )}
            {place.servesBreakfast && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
                Breakfast
              </span>
            )}
            {place.servesCoffee && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
                Coffee
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
