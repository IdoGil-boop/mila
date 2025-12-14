'use client';

import { motion } from 'framer-motion';
import { PlaceCategory } from '@/types';
import { CATEGORY_DEFINITIONS, getCategoryName } from '@/lib/categories';

interface ConfidenceChartProps {
  categories: {
    [category: string]: {
      confidenceScore: number;
    };
  };
  onImproveCategory?: (category: PlaceCategory) => void;
}

export default function ConfidenceChart({ categories, onImproveCategory }: ConfidenceChartProps) {
  const categoryEntries = Object.entries(categories).map(([category, data]) => ({
    category: category as PlaceCategory,
    confidence: data.confidenceScore,
    name: getCategoryName(category as PlaceCategory),
  })).sort((a, b) => a.confidence - b.confidence); // Sort by confidence (lowest first)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 1.0) return 'bg-emerald-600';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 1.0) return 'Perfect';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-espresso">Confidence by Category</h3>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Very Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-600 rounded"></div>
            <span>Perfect</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {categoryEntries.map(({ category, confidence, name }, index) => {
          const percentage = Math.round(confidence * 100);
          // Always use 0-100% scale, ensure minimum 2% width for visibility
          const barWidth = Math.max(percentage, 2);

          return (
            <div key={category} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(confidence)}/20 text-gray-700`}>
                    {getConfidenceLabel(confidence)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-espresso">{percentage}%</span>
                  {onImproveCategory && confidence < 1.0 && (
                    <button
                      onClick={() => onImproveCategory(category)}
                      className="text-xs px-2 py-1 bg-espresso/10 text-espresso rounded hover:bg-espresso/20 transition-colors"
                    >
                      Improve
                    </button>
                  )}
                </div>
              </div>
              {/* Bar container with percentage labels inside */}
              <div className="relative">
                {/* Background bar with full width */}
                <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                  {/* Confidence fill bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className={`h-full ${getConfidenceColor(confidence)} rounded-full relative`}
                    style={{ minWidth: '2%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categoryEntries.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No category data available
        </div>
      )}
    </div>
  );
}

