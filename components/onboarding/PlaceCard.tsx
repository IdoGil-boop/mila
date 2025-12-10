'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, DollarSign, Clock, ChevronDown, Check } from 'lucide-react';
import { OnboardingPlaceCard } from '@/types';

interface PlaceCardProps {
  place: OnboardingPlaceCard;
  selected?: boolean;
  onToggle?: (placeId: string) => void;
  compact?: boolean;
}

export default function PlaceCard({ place, selected = false, onToggle, compact = false }: PlaceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (onToggle) {
      onToggle(place.placeId);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <motion.div
      className={`
        relative bg-white rounded-lg border-2 overflow-hidden cursor-pointer
        ${selected ? 'border-espresso shadow-lg' : 'border-gray-200 hover:border-gray-300'}
        ${compact ? 'p-3' : 'p-4'}
      `}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Selection indicator */}
      {onToggle && selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 z-10 w-7 h-7 bg-espresso rounded-full flex items-center justify-center shadow-md"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* Photos */}
      {place.photos && place.photos.length > 0 && (
        <div className={`relative ${compact ? 'h-32' : 'h-48'} mb-3 rounded-lg overflow-hidden`}>
          {place.photos.length === 1 ? (
            <img
              src={place.photos[0]}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="grid grid-cols-2 gap-1 h-full">
              {place.photos.slice(0, 4).map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`${place.name} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Place info */}
      <div className="space-y-2">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
          {place.name}
        </h3>

        {/* Rating and price */}
        <div className="flex items-center gap-3 text-sm">
          {place.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{place.rating.toFixed(1)}</span>
            </div>
          )}
          {place.priceLevel && (
            <div className="flex items-center text-gray-600">
              {Array.from({ length: place.priceLevel }).map((_, i) => (
                <DollarSign key={i} className="w-3 h-3" />
              ))}
            </div>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{place.address}</span>
        </div>

        {/* Description (first review) */}
        {place.description && !compact && (
          <p className="text-sm text-gray-600 line-clamp-2">{place.description}</p>
        )}

        {/* Opening hours */}
        {place.regularOpeningHours?.openNow !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className={place.regularOpeningHours.openNow ? 'text-green-600' : 'text-red-600'}>
              {place.regularOpeningHours.openNow ? 'Open now' : 'Closed'}
            </span>
          </div>
        )}

        {/* Expand for reviews */}
        {place.reviews && place.reviews.length > 0 && !compact && (
          <button
            onClick={toggleExpand}
            className="flex items-center gap-1 text-sm text-espresso hover:text-espresso-dark mt-2"
          >
            <span>{expanded ? 'Hide' : 'Show'} reviews</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Expanded reviews */}
      <AnimatePresence>
        {expanded && place.reviews && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-gray-200 space-y-3"
          >
            {place.reviews.slice(0, 3).map((review, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{review.authorName}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-600">{review.rating}</span>
                  </div>
                </div>
                <p className="text-gray-600 line-clamp-3">{review.text}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
