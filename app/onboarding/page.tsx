'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import CategoryCard from '@/components/onboarding/CategoryCard';
import PlaceCard from '@/components/onboarding/PlaceCard';
import ABComparison from '@/components/onboarding/ABComparison';
import ResidentialPlaceInput from '@/components/onboarding/ResidentialPlaceInput';
import PlaceAutocomplete from '@/components/onboarding/PlaceAutocomplete';
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
  const [excludedPlaceIds, setExcludedPlaceIds] = useState<Set<string>>(new Set()); // Track excluded places across multiple button presses
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showManualInput, setShowManualInput] = useState(false); // Show when less than 4 results

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
            
            // Get location for autocomplete
            const placeResponse = await fetch(`/api/places/${placeId}`);
            if (placeResponse.ok) {
              const placeData = await placeResponse.json();
              if (placeData.success && placeData.place?.location) {
                setUserLocation({
                  lat: placeData.place.location.lat,
                  lng: placeData.place.location.lng,
                });
              }
            }
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

  const loadQuestion = async (excludePlaceIds: string[] = [], isButtonPress: boolean = false, providedMessage?: string, providedQueries?: string[], providedQuestionType?: 'multi-select' | 'ab-comparison') => {
    // Reset excluded places when loading a new question normally (not from button press)
    if (!isButtonPress && excludePlaceIds.length === 0) {
      setExcludedPlaceIds(new Set());
    }
    try {
      setLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:258',message:'Before fetch call',data:{loadingSet:true,excludePlaceIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const token = getToken();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:261',message:'Token retrieved',data:{hasToken:!!token,tokenLength:token?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/onboarding/get-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ excludePlaceIds, message: providedMessage, queries: providedQueries, questionType: providedQuestionType }),
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:270',message:'Fetch response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:273',message:'Response data parsed',data:{success:data.success,hasError:!!data.error,placesCount:data.places?.length,questionType:data.questionType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion
      if (data.success) {
        // #region agent log
        const currentPlaceIds = places.map(p => p.placeId).join(',');
        const newPlaceIds = data.places?.map((p: any) => p.placeId).join(',') || '';
        fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:275',message:'Before state updates',data:{questionType:data.questionType,questionNumber:data.questionNumber,placesCount:data.places?.length,currentPlaceIds,newPlaceIds,placesAreDifferent:currentPlaceIds!==newPlaceIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D,E'})}).catch(()=>{});
        // #endregion
        setQuestionType(data.questionType);
        setQuestionNumber(data.questionNumber);
        setMessage(data.message);
        setPlaces(data.places);
        setSelectedPlaces(new Set());
        
        // Show manual input if less than 4 results (for multi-select)
        if (data.questionType === 'multi-select' && data.places?.length < 4) {
          setShowManualInput(true);
        } else {
          setShowManualInput(false);
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:281',message:'After state updates',data:{placesSet:data.places?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:283',message:'API returned success=false',data:{error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setError(data.error || 'Failed to load question');
      }
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:286',message:'loadQuestion catch block',data:{error:err?.message,errorType:typeof err,errorString:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:290',message:'loadQuestion finally block',data:{loadingSetToFalse:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
        questionType: 'multi-select',
        selectedPlaceIds: Array.from(selectedPlaces),
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
          await loadQuestion([], false, data.nextMessage, data.nextQueries, data.nextQuestionType);
        } else {
          await loadQuestion([], false, data.nextMessage, data.nextQueries, data.nextQuestionType);
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
      setError(null);
      const token = getToken();
      
      if (!token) {
        setError('Authentication required. Please refresh the page.');
        setSubmitting(false);
        return;
      }
      
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(errorData.error || `Failed to submit answer: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        if (data.onboardingComplete) {
          setStep('complete');
          setSubmitting(false);
        } else if (data.nextCategory) {
          setCurrentCategory(data.nextCategory);
          try {
            await loadQuestion([], false, data.nextMessage, data.nextQueries, data.nextQuestionType);
          } catch (loadErr: any) {
            setError(loadErr.message || 'Failed to load next question');
            setSubmitting(false);
          }
        } else {
          try {
            await loadQuestion([], false, data.nextMessage, data.nextQueries, data.nextQuestionType);
          } catch (loadErr: any) {
            setError(loadErr.message || 'Failed to load next question');
            setSubmitting(false);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to submit answer');
      }
    } catch (err: any) {
      console.error('Error submitting AB comparison:', err);
      setError(err.message || 'Failed to submit answer');
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

  const handleGetNewResults = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:427',message:'handleGetNewResults called',data:{selectedPlacesSize:selectedPlaces.size,loading,submitting,currentPlaceIds:places.map(p=>p.placeId),excludedCount:excludedPlaceIds.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setSelectedPlaces(new Set());
    
    // Add current places to excluded list (never reset, always accumulate)
    const currentPlaceIds = places.map(p => p.placeId);
    setExcludedPlaceIds(prev => {
      const newSet = new Set(prev);
      currentPlaceIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:429',message:'Before loadQuestion call with accumulated excludeIds',data:{selectedPlacesCleared:true,currentPlaceIds,excludedPlaceIds:Array.from(excludedPlaceIds),totalExcluded:excludedPlaceIds.size + currentPlaceIds.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      // Pass accumulated excluded places (current + all previous)
      const allExcludedIds = Array.from(new Set(Array.from(excludedPlaceIds).concat(currentPlaceIds)));
      await loadQuestion(allExcludedIds, true); // true indicates this is from button press
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:432',message:'loadQuestion completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:435',message:'loadQuestion threw error',data:{error:err?.message,errorType:typeof err,errorString:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Failed to load new results');
    }
  };

  const handleAddPlace = (place: OnboardingPlaceCard) => {
    // Add place to the list if not already present
    if (!places.some(p => p.placeId === place.placeId)) {
      setPlaces(prev => [...prev, place]);
      // Also add to excluded list so it doesn't get fetched again
      setExcludedPlaceIds(prev => {
        const newSet = new Set(prev);
        newSet.add(place.placeId);
        return newSet;
      });
      // Hide manual input if we now have 4+ places
      if (places.length + 1 >= 4) {
        setShowManualInput(false);
      }
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

            {/* Place Autocomplete - show between headline and results */}
            {questionType === 'multi-select' && currentCategory && userLocation && (
              <PlaceAutocomplete
                category={currentCategory}
                location={userLocation}
                onPlaceSelect={handleAddPlace}
                excludedPlaceIds={excludedPlaceIds}
              />
            )}

            {/* Show message when less than 4 results */}
            {questionType === 'multi-select' && showManualInput && places.length < 4 && (
              <div className="bg-offwhite rounded-lg border border-espresso/20 p-4 text-center">
                <p className="text-sm text-gray-700">
                  We couldn't find enough places. Please add some {currentCategory && CATEGORY_DEFINITIONS.find((c) => c.id === currentCategory)?.name.toLowerCase()} using the search above.
                </p>
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

                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={(e) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:594',message:'Button onClick fired',data:{loading,disabled:loading,eventType:e.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                      // #endregion
                      handleGetNewResults();
                    }}
                    disabled={loading}
                    className="px-6 py-2 text-espresso hover:text-espresso-dark border border-espresso/30 rounded-lg
                             hover:border-espresso/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : "I don't know these places"}
                  </button>
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
              </div>
            )}

            {/* A/B Comparison */}
            {questionType === 'ab-comparison' && places.length === 2 && (
              <div className="space-y-6">
                <ABComparison
                  key={`${places[0].placeId}-${places[1].placeId}-${questionNumber}`}
                  placeA={places[0]}
                  placeB={places[1]}
                  onSubmit={handleABSubmit}
                />
                <div className="flex justify-center">
                  <button
                    onClick={(e) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/onboarding/page.tsx:634',message:'A/B Button onClick fired',data:{loading,submitting,disabled:loading||submitting,eventType:e.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                      // #endregion
                      handleGetNewResults();
                    }}
                    disabled={loading || submitting}
                    className="px-6 py-2 text-espresso hover:text-espresso-dark border border-espresso/30 rounded-lg
                             hover:border-espresso/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : "I don't know these places"}
                  </button>
                </div>
              </div>
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

