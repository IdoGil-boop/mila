'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { OnboardingPlaceCard } from '@/types';
import PlaceCard from './PlaceCard';

interface ABComparisonProps {
  placeA: OnboardingPlaceCard;
  placeB: OnboardingPlaceCard;
  onSubmit: (sliderValue: number) => void;
}

export default function ABComparison({ placeA, placeB, onSubmit }: ABComparisonProps) {
  const [sliderValue, setSliderValue] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  // Reset submitted state when places change (new question loaded)
  useEffect(() => {
    setSubmitted(false);
    setSliderValue(5); // Reset slider to neutral position
  }, [placeA.placeId, placeB.placeId]);

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit(sliderValue);
  };

  const getPreferenceText = () => {
    if (sliderValue === 5) return 'No preference';
    if (sliderValue < 5) {
      const strength = 5 - sliderValue;
      if (strength >= 4) return 'Strongly prefer A';
      if (strength >= 2) return 'Prefer A';
      return 'Slightly prefer A';
    } else {
      const strength = sliderValue - 5;
      if (strength >= 4) return 'Strongly prefer B';
      if (strength >= 2) return 'Prefer B';
      return 'Slightly prefer B';
    }
  };

  return (
    <div className="space-y-6">
      {/* Place cards side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-center font-medium text-gray-700 mb-2">Place A</div>
          <PlaceCard place={placeA} compact />
        </div>
        <div className="space-y-2">
          <div className="text-center font-medium text-gray-700 mb-2">Place B</div>
          <PlaceCard place={placeB} compact />
        </div>
      </div>

      {/* Slider */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <div className="text-center">
          <h3 className="font-medium text-gray-900 mb-2">Which do you prefer?</h3>
          <p className="text-sm text-gray-600">Drag the slider to show your preference</p>
        </div>

        {/* Slider input */}
        <div className="relative py-4">
          <input
            type="range"
            min="1"
            max="10"
            value={sliderValue}
            onChange={(e) => setSliderValue(parseInt(e.target.value))}
            disabled={submitted}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                     slider-thumb:appearance-none slider-thumb:w-6 slider-thumb:h-6
                     slider-thumb:rounded-full slider-thumb:bg-espresso slider-thumb:cursor-pointer
                     slider-thumb:shadow-lg slider-thumb:border-2 slider-thumb:border-white
                     disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right,
                #5B4636 0%,
                #5B4636 ${((sliderValue - 1) / 9) * 100}%,
                #e5e7eb ${((sliderValue - 1) / 9) * 100}%,
                #e5e7eb 100%)`,
            }}
          />

          {/* Labels */}
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-600">Prefer A</span>
            <span className="text-gray-600">Prefer B</span>
          </div>
        </div>

        {/* Preference indicator */}
        <motion.div
          key={sliderValue}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="inline-block px-4 py-2 bg-offwhite rounded-full border border-espresso/20">
            <span className="font-medium text-espresso">{getPreferenceText()}</span>
          </div>
        </motion.div>

        {/* Submit button */}
        {!submitted && (
          <motion.button
            onClick={handleSubmit}
            className="w-full py-3 bg-espresso text-white rounded-lg font-medium
                     hover:bg-espresso-dark transition-colors"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Submit Preference
          </motion.button>
        )}

        {submitted && (
          <div className="text-center text-gray-600">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-block"
            >
              Processing your answer...
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
