'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Trash2, X, MapPin } from 'lucide-react';
import { SavedPlace } from '@/types';

interface SavedPlacesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: (placeId: string, rating: number, notes?: string) => void;
  onRemove: (placeId: string) => void;
}

export default function SavedPlacesDropdown({
  isOpen,
  onClose,
  onRate,
  onRemove,
}: SavedPlacesDropdownProps) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupedPlaces, setGroupedPlaces] = useState<Record<string, SavedPlace[]>>({});
  const [ratingModalPlace, setRatingModalPlace] = useState<SavedPlace | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedPlaces();
    }
  }, [isOpen]);

  const fetchSavedPlaces = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/places/saved', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSavedPlaces(data.places);
        setGroupedPlaces(data.groupedByCategory);
      }
    } catch (error) {
      console.error('Error fetching saved places:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (placeId: string) => {
    if (!confirm('Remove this place from your saved list?')) return;

    try {
      const response = await fetch(`/api/places/${placeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        onRemove(placeId);
        fetchSavedPlaces();
      }
    } catch (error) {
      console.error('Error removing place:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 right-4 w-96 max-h-[600px] bg-white shadow-lg border border-gray-300 rounded-md z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <h2 className="font-semibold text-gray-900">Saved Places</h2>
                <span className="text-sm text-gray-500">({savedPlaces.length})</span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : savedPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Heart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-600 mb-1">No saved places yet</p>
                  <p className="text-sm text-gray-500">
                    Save places you love to keep them organized
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {Object.entries(groupedPlaces).map(([category, places]) => (
                    <div key={category} className="p-4">
                      <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {places.map((place) => (
                          <div
                            key={place.placeId}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 group rounded-sm"
                          >
                            {/* Thumbnail */}
                            {place.photos?.[0] && (
                              <img
                                src={place.photos[0]}
                                alt={place.placeName}
                                className="w-12 h-12 object-cover flex-shrink-0 rounded-sm"
                              />
                            )}

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm truncate">
                                {place.placeName}
                              </h4>
                              {place.address && (
                                <p className="text-xs text-gray-500 truncate">{place.address}</p>
                              )}
                              {place.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-gray-600">{place.rating}</span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setRatingModalPlace(place)}
                                className="p-1.5 text-espresso hover:bg-offwhite rounded-sm"
                                title="Rate"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemove(place.placeId)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-sm"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Rating Modal */}
          <AnimatePresence>
            {ratingModalPlace && (
              <RatingModal
                place={ratingModalPlace}
                onClose={() => setRatingModalPlace(null)}
                onSubmit={(rating, notes) => {
                  onRate(ratingModalPlace.placeId, rating, notes);
                  setRatingModalPlace(null);
                  fetchSavedPlaces();
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

// Rating Modal Component
function RatingModal({
  place,
  onClose,
  onSubmit,
}: {
  place: SavedPlace;
  onClose: () => void;
  onSubmit: (rating: number, notes?: string) => void;
}) {
  const [rating, setRating] = useState(place.rating || 0);
  const [notes, setNotes] = useState(place.notes || '');
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) return;

    try {
      const response = await fetch('/api/places/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          placeId: place.placeId,
          rating,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        onSubmit(rating, notes);
      }
    } catch (error) {
      console.error('Error rating place:', error);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-xl border border-gray-300 rounded-md z-50 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate this place</h3>

        {/* Place info */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
          {place.photos?.[0] && (
            <img
              src={place.photos[0]}
              alt={place.placeName}
              className="w-16 h-16 object-cover rounded-sm"
            />
          )}
          <div>
            <h4 className="font-medium text-gray-900">{place.placeName}</h4>
            {place.address && <p className="text-sm text-gray-500">{place.address}</p>}
          </div>
        </div>

        {/* Star rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-colors"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you think about this place?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-espresso resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors rounded-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="flex-1 px-4 py-2 bg-espresso text-white hover:bg-espresso-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm"
          >
            Save Rating
          </button>
        </div>
      </motion.div>
    </>
  );
}
