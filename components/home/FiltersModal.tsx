'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: Record<string, boolean>) => void;
  currentFilters?: Record<string, boolean>;
}

const AVAILABLE_FILTERS = [
  { id: 'dineIn', label: 'Dine-in', category: 'Service' },
  { id: 'takeout', label: 'Takeout', category: 'Service' },
  { id: 'delivery', label: 'Delivery', category: 'Service' },
  { id: 'outdoorSeating', label: 'Outdoor seating', category: 'Amenities' },
  { id: 'allowsDogs', label: 'Dog friendly', category: 'Amenities' },
  { id: 'goodForGroups', label: 'Good for groups', category: 'Amenities' },
  { id: 'servesCoffee', label: 'Serves coffee', category: 'Food & Drink' },
  { id: 'servesBreakfast', label: 'Breakfast', category: 'Food & Drink' },
  { id: 'servesBrunch', label: 'Brunch', category: 'Food & Drink' },
  { id: 'servesLunch', label: 'Lunch', category: 'Food & Drink' },
  { id: 'servesDinner', label: 'Dinner', category: 'Food & Drink' },
  { id: 'servesVegetarianFood', label: 'Vegetarian options', category: 'Food & Drink' },
];

export default function FiltersModal({
  isOpen,
  onClose,
  onApply,
  currentFilters = {},
}: FiltersModalProps) {
  const [filters, setFilters] = useState<Record<string, boolean>>(currentFilters);

  const handleToggle = (filterId: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterId]: !prev[filterId],
    }));
  };

  const handleClear = () => {
    setFilters({});
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Group filters by category
  const groupedFilters = AVAILABLE_FILTERS.reduce((acc, filter) => {
    if (!acc[filter.category]) {
      acc[filter.category] = [];
    }
    acc[filter.category].push(filter);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_FILTERS>);

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
            className="fixed inset-0 bg-black/40 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-espresso/10 bg-offwhite">
              <div>
                <h2 className="text-2xl font-bold text-charcoal mb-1">
                  Filters
                </h2>
                {activeFilterCount > 0 && (
                  <p className="text-sm text-espresso font-medium">
                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 hover:bg-espresso/10 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {Object.entries(groupedFilters).map(([category, categoryFilters]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {categoryFilters.map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => handleToggle(filter.id)}
                          className={`
                            flex items-center justify-between px-4 py-3 border-2 transition-all rounded-lg
                            ${
                              filters[filter.id]
                                ? 'border-espresso bg-offwhite shadow-sm'
                                : 'border-gray-200 hover:border-espresso/40 hover:bg-offwhite'
                            }
                          `}
                        >
                          <span
                            className={`text-sm font-semibold ${
                              filters[filter.id] ? 'text-espresso' : 'text-gray-700'
                            }`}
                          >
                            {filter.label}
                          </span>
                          {filters[filter.id] && (
                            <div className="w-5 h-5 bg-espresso flex items-center justify-center rounded-md shadow-md">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-espresso/10 bg-offwhite">
              <button
                onClick={handleClear}
                disabled={activeFilterCount === 0}
                className="text-sm font-semibold text-espresso hover:text-espresso-dark disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 hover:bg-espresso/10 transition-colors rounded-lg"
              >
                Clear all
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 font-semibold transition-colors rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="px-6 py-3 bg-espresso text-white hover:bg-espresso-dark font-bold shadow-lg transition-all rounded-lg"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
