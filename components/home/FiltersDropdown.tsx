'use client';

import { useState, useMemo } from 'react';
import { Search, Check, X } from 'lucide-react';

interface FiltersDropdownProps {
  currentFilters: Record<string, boolean>;
  onApply: (filters: Record<string, boolean>) => void;
  onClose: () => void;
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

export default function FiltersDropdown({ currentFilters, onApply, onClose }: FiltersDropdownProps) {
  const [filters, setFilters] = useState<Record<string, boolean>>(currentFilters);
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  // Filter options based on search query
  const filteredFilters = useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_FILTERS;
    
    const query = searchQuery.toLowerCase();
    return AVAILABLE_FILTERS.filter(filter => 
      filter.label.toLowerCase().includes(query) ||
      filter.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered filters by category
  const groupedFilters = useMemo(() => {
    return filteredFilters.reduce((acc, filter) => {
      if (!acc[filter.category]) {
        acc[filter.category] = [];
      }
      acc[filter.category].push(filter);
      return acc;
    }, {} as Record<string, typeof AVAILABLE_FILTERS>);
  }, [filteredFilters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-espresso/20 rounded-lg shadow-xl z-50 flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-espresso/10 bg-offwhite">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-charcoal">Filters</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-espresso/10 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filters..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-espresso/20 rounded-lg text-sm text-charcoal placeholder-espresso/50 focus:outline-none focus:border-espresso focus:ring-2 focus:ring-espresso/20"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.keys(groupedFilters).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No filters found matching "{searchQuery}"
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedFilters).map(([category, categoryFilters]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {categoryFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleToggle(filter.id)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left
                        ${
                          filters[filter.id]
                            ? 'bg-offwhite border border-espresso/30'
                            : 'border border-transparent hover:bg-offwhite hover:border-espresso/20'
                        }
                      `}
                    >
                      <span
                        className={`text-sm font-medium ${
                          filters[filter.id] ? 'text-espresso' : 'text-gray-700'
                        }`}
                      >
                        {filter.label}
                      </span>
                      {filters[filter.id] && (
                        <div className="w-4 h-4 bg-espresso-light flex items-center justify-center rounded">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-espresso/10 bg-offwhite flex items-center justify-between gap-2">
        <button
          onClick={handleClear}
          disabled={activeFilterCount === 0}
          className="text-sm font-medium text-espresso hover:text-espresso-dark disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 hover:bg-espresso/10 transition-colors rounded"
        >
          Clear
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-espresso-light text-white hover:bg-espresso font-semibold transition-colors rounded-lg text-sm"
        >
          Apply {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>
    </div>
  );
}

