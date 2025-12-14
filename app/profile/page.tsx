'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Calendar, MapPin, Save, Loader2, Crown, Mail, Sparkles, Eye, Edit, RotateCcw, ExternalLink, TrendingUp } from 'lucide-react';
import ResidentialPlaceInput from '@/components/onboarding/ResidentialPlaceInput';
import ConfidenceChart from '@/components/shared/ConfidenceChart';
import { UserProfile, UserBIO, PlaceCategory } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bio, setBio] = useState<UserBIO | null>(null);
  const [showBio, setShowBio] = useState(false);
  const [loadingBio, setLoadingBio] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const [upgradingPremium, setUpgradingPremium] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [residentialPlace, setResidentialPlace] = useState('');
  const [residentialPlaceId, setResidentialPlaceId] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setUserProfile(data.user);
        setName(data.user.name || '');
        setDob(data.user.dob || '');
        setResidentialPlace(data.user.residentialPlace || '');
        setResidentialPlaceId(data.user.residentialPlaceId || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      // Update name and dob
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          dob: dob || undefined,
        }),
      });

      if (!profileResponse.ok) {
        const data = await profileResponse.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update residential place if changed
      if (residentialPlaceId && residentialPlaceId !== userProfile?.residentialPlaceId) {
        const placeResponse = await fetch('/api/user/residential-place', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            placeId: residentialPlaceId,
            displayName: residentialPlace,
          }),
        });

        if (!placeResponse.ok) {
          const data = await placeResponse.json();
          throw new Error(data.error || 'Failed to update residential place');
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Refresh profile data
      const refreshResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setUserProfile(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleResidentialPlaceSelect = (placeId: string, description: string) => {
    setResidentialPlaceId(placeId);
    setResidentialPlace(description);
  };

  const handleLoadBio = async () => {
    if (bio) {
      setShowBio(!showBio);
      return;
    }

    setLoadingBio(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/bio', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setBio(data.bio);
        setShowBio(true);
      } else {
        setError(data.error || 'Failed to load BIO');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load BIO');
    } finally {
      setLoadingBio(false);
    }
  };

  const handleRetakeOnboarding = async () => {
    if (!confirm('Are you sure you want to retake onboarding? This will reset your preferences and you\'ll need to go through the onboarding process again.')) {
      return;
    }

    setResettingOnboarding(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/onboarding/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/onboarding');
      } else {
        setError(data.error || 'Failed to reset onboarding');
        setResettingOnboarding(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset onboarding');
      setResettingOnboarding(false);
    }
  };

  const handleImproveCategory = async (category: PlaceCategory) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await fetch('/api/onboarding/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category }),
      });

      const data = await response.json();
      if (data.success) {
        router.push('/onboarding');
      } else {
        setError(data.error || 'Failed to start onboarding for category');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start onboarding for category');
    }
  };

  const handleGoPremium = async () => {
    setUpgradingPremium(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setUpgradingPremium(false);
      return;
    }

    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: 'premium' }),
      });

      const data = await response.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Failed to create checkout. Please try again.');
        setUpgradingPremium(false);
      }
    } catch (err: any) {
      setError('Failed to create checkout. Please try again.');
      setUpgradingPremium(false);
    }
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:support@loca.app?subject=Support Request&body=Hello,%0D%0A%0D%0A[Please describe your issue or question here]%0D%0A%0D%0AUser: ${userProfile?.email || 'N/A'}%0D%0AUser ID: ${userProfile?.userId || 'N/A'}`;
  };

  const isPremium = userProfile?.subscription?.tier === 'premium' || userProfile?.subscription?.tier === 'pay_as_you_go';

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-espresso animate-spin mx-auto mb-4" />
          <p className="text-espresso/70">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Header */}
      <header className="bg-espresso-light border-b border-espresso/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Manage Profile</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-espresso/20 shadow-lg p-6 md:p-8"
        >
          {/* Success message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
            >
              Profile updated successfully!
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-espresso mb-2">
                <User className="w-4 h-4" />
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all"
                placeholder="Your name"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="flex items-center gap-2 text-sm font-semibold text-espresso mb-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all"
              />
              <p className="mt-1 text-xs text-gray-500">This helps us personalize your recommendations</p>
            </div>

            {/* Residential Place */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-espresso mb-2">
                <MapPin className="w-4 h-4" />
                Residential Place
              </label>
              <ResidentialPlaceInput
                onSelect={handleResidentialPlaceSelect}
                initialValue={residentialPlace}
              />
              <p className="mt-1 text-xs text-gray-500">Your current city or area</p>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-espresso mb-2">
                <User className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            {/* Save button */}
            <div className="pt-4 border-t border-gray-200">
              <motion.button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full md:w-auto px-6 py-3 bg-espresso text-white rounded-lg font-medium
                         hover:bg-espresso-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
                whileHover={{ scale: saving || !name.trim() ? 1 : 1.02 }}
                whileTap={{ scale: saving || !name.trim() ? 1 : 0.98 }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Upgrade to Premium Section */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 shadow-lg p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-espresso mb-2">Upgrade to Premium</h2>
                <p className="text-gray-700 mb-4">
                  Unlock advanced features including detailed place information, accessibility options, and priority support.
                </p>
                <motion.button
                  onClick={handleGoPremium}
                  disabled={upgradingPremium}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-medium
                           hover:from-yellow-600 hover:to-orange-600 transition-all shadow-sm
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  whileHover={{ scale: upgradingPremium ? 1 : 1.02 }}
                  whileTap={{ scale: upgradingPremium ? 1 : 0.98 }}
                >
                  {upgradingPremium ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-5 h-5" />
                      <span>Go Premium</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Contact Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-white rounded-xl border border-espresso/20 shadow-lg p-6 md:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-espresso/10 rounded-lg">
              <Mail className="w-6 h-6 text-espresso" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-espresso mb-2">Contact Support</h2>
              <p className="text-gray-700 mb-4">
                Need help? Have a question or feedback? We're here to assist you.
              </p>
              <button
                onClick={handleContactSupport}
                className="px-6 py-3 bg-espresso text-white rounded-lg font-medium
                         hover:bg-espresso-dark transition-colors flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                <span>Send Email</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* BIO Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-white rounded-xl border border-espresso/20 shadow-lg p-6 md:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-espresso/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-espresso" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-espresso mb-2">Your Preferences (BIO)</h2>
              <p className="text-gray-700 mb-4">
                Your personalized preferences profile that helps us recommend the perfect places for you.
              </p>
              
              {showBio && bio ? (
                <div className="mb-4 p-4 bg-offwhite rounded-lg border border-espresso/10 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-espresso mb-2">Summary</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{bio.bioText}</p>
                  </div>
                  
                  {/* Confidence Chart */}
                  {bio.categories && Object.keys(bio.categories).length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-espresso/10">
                      <ConfidenceChart 
                        categories={bio.categories} 
                        onImproveCategory={handleImproveCategory}
                      />
                    </div>
                  )}
                  
                  {bio.categories && Object.keys(bio.categories).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-espresso mb-3">Category Preferences</h3>
                      <div className="space-y-3">
                        {Object.entries(bio.categories).map(([category, data]: [string, any]) => (
                          <div key={category} className="p-3 bg-white rounded border border-espresso/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-espresso capitalize">{category.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  Confidence: {Math.round(data.confidenceScore * 100)}%
                                </span>
                                {data.confidenceScore < 1.0 && (
                                  <button
                                    onClick={() => handleImproveCategory(category as PlaceCategory)}
                                    className="text-xs px-2 py-1 bg-espresso/10 text-espresso rounded hover:bg-espresso/20 transition-colors flex items-center gap-1"
                                  >
                                    <TrendingUp className="w-3 h-3" />
                                    Improve
                                  </button>
                                )}
                              </div>
                            </div>
                            {data.keywords && data.keywords.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-600 mb-1">Keywords:</p>
                                <div className="flex flex-wrap gap-1">
                                  {data.keywords.map((keyword: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-espresso/10 text-xs text-espresso rounded">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {data.preferredAttributes && data.preferredAttributes.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-600 mb-1">Preferred Attributes:</p>
                                <div className="flex flex-wrap gap-1">
                                  {data.preferredAttributes.map((attr: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-green-100 text-xs text-green-700 rounded">
                                      {attr}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {data.stylePreferences && (
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Style:</p>
                                <p className="text-xs text-gray-700">{data.stylePreferences}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-espresso/10">
                    <p className="text-xs text-gray-500">
                      Version {bio.version} • Last updated: {new Date(bio.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : showBio && !bio ? (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No BIO found. Complete onboarding to generate your personalized preferences profile.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleLoadBio}
                  disabled={loadingBio}
                  className="px-4 py-2 bg-espresso text-white rounded-lg font-medium
                           hover:bg-espresso-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {loadingBio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : showBio ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Hide BIO</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>View BIO</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleRetakeOnboarding}
                  disabled={resettingOnboarding}
                  className="px-4 py-2 border-2 border-espresso text-espresso rounded-lg font-medium
                           hover:bg-espresso/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {resettingOnboarding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Retake Onboarding</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

