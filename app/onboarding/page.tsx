'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import CategoryCard from '@/components/onboarding/CategoryCard';
import PlaceCard from '@/components/onboarding/PlaceCard';
import ABComparison from '@/components/onboarding/ABComparison';
import ResidentialPlaceInput from '@/components/onboarding/ResidentialPlaceInput';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { PlaceCategory, OnboardingPlaceCard } from '@/types';

type OnboardingStep = 'loading' | 'location' | 'categories' | 'discover' | 'complete';

interface OnboardingSession {
  currentStep: string;
  currentCategory?: PlaceCategory;
  questionsAsked: number;
  completed: boolean;
  selectedCategories?: PlaceCategory[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OnboardingStep>('loading');
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<PlaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Question state
  const [questionType, setQuestionType] = useState<'multi-select' | 'ab-comparison'>('multi-select');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [message, setMessage] = useState('');
  const [places, setPlaces] = useState<OnboardingPlaceCard[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<PlaceCategory | null>(null);
  const [residentialPlaceId, setResidentialPlaceId] = useState<string>('');
  const [residentialPlaceName, setResidentialPlaceName] = useState<string>('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    // Check for token in URL params (for testing)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      // Remove token from URL for security, then load session
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      loadSession();
      return;
    }
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = (): string | null => {
    return localStorage.getItem('token');
  };

  const loadSession = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/onboarding/session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        // No session, initialize one
        await initializeSession();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load session' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSession(data.session);
        setSelectedCategories(data.session.selectedCategories || []);
        
        // Check if user has residential place set
        const userResponse = await fetch('/api/user/residential-place', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let hasResidentialPlace = false;
        let placeId = '';
        let placeName = '';
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.residentialPlaceId) {
            placeId = userData.residentialPlaceId;
            placeName = userData.residentialPlace || '';
            setResidentialPlaceId(placeId);
            setResidentialPlaceName(placeName);
            hasResidentialPlace = true;
          }
        }
        
        if (data.session.completed) {
          setStep('complete');
        } else if (!hasResidentialPlace) {
          // Need to set residential place first
          setStep('location');
        } else if (data.session.currentStep === 'categories') {
          setStep('categories');
        } else if (data.session.currentStep === 'discover') {
          setStep('discover');
          setCurrentCategory(data.session.currentCategory || null);
          await loadQuestion();
        }
      } else {
        throw new Error(data.error || 'Failed to load session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load onboarding');
    } finally {
      setLoading(false);
    }
  };

  const initializeSession = async () => {
    try {
      const token = getToken();
      
      // Check if user has residential place set
      const userResponse = await fetch('/api/user/residential-place', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let hasResidentialPlace = false;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success && userData.residentialPlaceId) {
          setResidentialPlaceId(userData.residentialPlaceId);
          setResidentialPlaceName(userData.residentialPlace || '');
          hasResidentialPlace = true;
        }
      }
      
      const response = await fetch('/api/onboarding/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        if (!hasResidentialPlace) {
          setStep('location');
        } else {
          setStep('categories');
        }
      } else {
        setError(data.error || 'Failed to initialize onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize onboarding');
    }
  };

  const handleLocationSelect = async (placeId: string, description: string) => {
    setResidentialPlaceId(placeId);
    setResidentialPlaceName(description);
  };

  const handleSaveLocation = async () => {
    if (!residentialPlaceId) {
      setError('Please select a location');
      return;
    }

    try {
      setSavingLocation(true);
      const token = getToken();
      const response = await fetch('/api/user/residential-place', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          placeId: residentialPlaceId,
          formattedAddress: residentialPlaceName, // Pass the address we already have
          displayName: residentialPlaceName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Move to categories step
        setStep('categories');
      } else {
        setError(data.error || 'Failed to save location');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleCategoryToggle = (categoryId: PlaceCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSubmitCategories = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch('/api/onboarding/select-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ categories: selectedCategories }),
      });

      const data = await response.json();
      if (data.success) {
        setStep('discover');
        setCurrentCategory(data.nextCategory);
        await loadQuestion();
      } else {
        setError(data.error || 'Failed to save categories');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save categories');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch('/api/onboarding/get-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        setQuestionType(data.questionType);
        setQuestionNumber(data.questionNumber);
        setMessage(data.message);
        setPlaces(data.places);
        setSelectedPlaces(new Set());
      } else {
        setError(data.error || 'Failed to load question');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceToggle = (placeId: string) => {
    if (questionType === 'multi-select') {
      setSelectedPlaces((prev) => {
        const next = new Set(prev);
        if (next.has(placeId)) {
          next.delete(placeId);
        } else {
          next.add(placeId);
        }
        return next;
      });
    }
  };

  const handleSubmitAnswer = async () => {
    if (questionType === 'multi-select' && selectedPlaces.size === 0) {
      setError('Please select at least one place');
      return;
    }

    try {
      setSubmitting(true);
      const token = getToken();
      
      const body: any = {
        selectedPlaceIds: questionType === 'multi-select' ? Array.from(selectedPlaces) : [],
      };

      if (questionType === 'ab-comparison') {
        // For A/B, we need slider value - this will be handled by ABComparison component
        return;
      }

      const response = await fetch('/api/onboarding/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        if (data.onboardingComplete) {
          setStep('complete');
        } else if (data.nextCategory) {
          setCurrentCategory(data.nextCategory);
          await loadQuestion();
        } else {
          await loadQuestion();
        }
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleABSubmit = async (sliderValue: number) => {
    try {
      setSubmitting(true);
      const token = getToken();
      
      const response = await fetch('/api/onboarding/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionType: 'ab-comparison',
          sliderValue,
          selectedPlaceIds: places.map((p) => p.placeId),
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.onboardingComplete) {
          setStep('complete');
        } else if (data.nextCategory) {
          setCurrentCategory(data.nextCategory);
          await loadQuestion();
        } else {
          await loadQuestion();
        }
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    try {
      const token = getToken();
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/');
    } catch (err) {
      router.push('/');
    }
  };

  const handleSkipCategory = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/onboarding/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skipCategory: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.onboardingComplete) {
          setStep('complete');
        } else if (data.nextCategory) {
          setCurrentCategory(data.nextCategory);
          await loadQuestion();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to skip category');
    }
  };

  if (loading && step === 'loading') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="w-12 h-12 border-4 border-espresso/20 border-t-espresso rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md">
          <h2 className="text-lg font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadSession();
            }}
            className="px-4 py-2 bg-espresso text-white rounded-lg hover:bg-espresso-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Location Step */}
        {step === 'location' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h1 className="text-3xl font-bold text-espresso mb-2">
                Where do you live?
              </h1>
              <p className="text-gray-600">
                We'll use this to find places near you and personalize your experience.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <ResidentialPlaceInput
                onSelect={handleLocationSelect}
                initialValue={residentialPlaceName}
              />
            </div>

            <div className="flex justify-center">
              <motion.button
                onClick={handleSaveLocation}
                disabled={!residentialPlaceId || savingLocation}
                className="px-8 py-3 bg-espresso text-white rounded-lg font-medium
                         hover:bg-espresso-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: residentialPlaceId && !savingLocation ? 1.02 : 1 }}
                whileTap={{ scale: residentialPlaceId && !savingLocation ? 0.98 : 1 }}
              >
                {savingLocation ? 'Saving...' : 'Continue'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Categories Step */}
        {step === 'categories' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h1 className="text-3xl font-bold text-espresso mb-2">
                What types of places interest you?
              </h1>
              <p className="text-gray-600">
                Select all categories you'd like to explore. You can choose multiple.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {CATEGORY_DEFINITIONS.map((category) => {
                const Icon = category.icon;
                return (
                  <CategoryCard
                    key={category.id}
                    id={category.id}
                    name={category.name}
                    icon={<Icon />}
                    selected={selectedCategories.includes(category.id)}
                    onToggle={handleCategoryToggle}
                  />
                );
              })}
            </div>

            <div className="flex justify-center">
              <motion.button
                onClick={handleSubmitCategories}
                disabled={selectedCategories.length === 0 || loading}
                className="px-8 py-3 bg-espresso text-white rounded-lg font-medium
                         hover:bg-espresso-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: selectedCategories.length > 0 ? 1.02 : 1 }}
                whileTap={{ scale: selectedCategories.length > 0 ? 0.98 : 1 }}
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Discovery/Questions Step */}
        {step === 'discover' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-espresso mb-2">
                {currentCategory && CATEGORY_DEFINITIONS.find((c) => c.id === currentCategory)?.name}
              </h1>
              {questionNumber > 0 && (
                <p className="text-sm text-gray-600">
                  Question {questionNumber} of ~10
                </p>
              )}
            </div>

            {/* Message */}
            {message && (
              <div className="bg-white rounded-lg border border-espresso/20 p-6 text-center">
                <p className="text-lg text-gray-800">{message}</p>
              </div>
            )}

            {/* Multi-select question */}
            {questionType === 'multi-select' && places.length > 0 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {places.map((place) => (
                    <PlaceCard
                      key={place.placeId}
                      place={place}
                      selected={selectedPlaces.has(place.placeId)}
                      onToggle={handlePlaceToggle}
                    />
                  ))}
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleSkipCategory}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  >
                    I'm done with this category
                  </button>
                  <motion.button
                    onClick={handleSubmitAnswer}
                    disabled={selectedPlaces.size === 0 || submitting}
                    className="px-8 py-2 bg-espresso text-white rounded-lg font-medium
                             hover:bg-espresso-dark transition-colors disabled:opacity-50"
                    whileHover={{ scale: selectedPlaces.size > 0 ? 1.02 : 1 }}
                    whileTap={{ scale: selectedPlaces.size > 0 ? 0.98 : 1 }}
                  >
                    {submitting ? 'Processing...' : 'Continue'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* A/B Comparison */}
            {questionType === 'ab-comparison' && places.length === 2 && (
              <ABComparison
                placeA={places[0]}
                placeB={places[1]}
                onSubmit={handleABSubmit}
              />
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto mb-2">
                  <div className="w-8 h-8 border-4 border-espresso/20 border-t-espresso rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-gray-600">Loading next question...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Completion Step */}
        {step === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto bg-espresso rounded-full flex items-center justify-center"
            >
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            <h1 className="text-3xl font-bold text-espresso">
              Your profile is ready!
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Let's start exploring amazing places tailored to your preferences.
            </p>

            <motion.button
              onClick={handleComplete}
              className="px-8 py-3 bg-espresso text-white rounded-lg font-medium
                       hover:bg-espresso-dark transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Exploring
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

