'use client';

import { useState, useEffect } from 'react';
import { Heart, User, MapPin, LogIn } from 'lucide-react';
import SearchBar from '@/components/home/SearchBar';
import ResultCard from '@/components/home/ResultCard';
import SavedPlacesDropdown from '@/components/home/SavedPlacesDropdown';
import SignInDropdown from '@/components/auth/SignInDropdown';
import SignUpDrawer from '@/components/auth/SignUpDrawer';
import ProfileDrawer from '@/components/auth/ProfileDrawer';
import { SearchResult, PlaceCategory, UserProfile } from '@/types';

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [showSignInDropdown, setShowSignInDropdown] = useState(false);
  const [showSignUpDrawer, setShowSignUpDrawer] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [currentSearch, setCurrentSearch] = useState<{
    destination: string;
    destinationPlaceId: string;
    category: PlaceCategory;
  } | null>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:26',message:'useEffect started',data:{isAuthenticatedInitial:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Check if user is authenticated
    const checkAuth = async () => {
      // #region agent log
      const tokenBefore = localStorage.getItem('token');
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:30',message:'checkAuth called',data:{token:tokenBefore,tokenType:typeof tokenBefore,tokenLength:tokenBefore?.length,tokenTruthy:!!tokenBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      const token = localStorage.getItem('token');
      const authValue = !!token;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:33',message:'Before setIsAuthenticated',data:{authValue,currentIsAuthenticated:isAuthenticated},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      setIsAuthenticated(authValue);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:35',message:'After setIsAuthenticated',data:{authValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      
      // Fetch user profile if authenticated
      if (authValue && token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data.user);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
    };

    checkAuth();

    // Listen for storage changes (e.g., when user logs in/out in another tab)
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleSearch = async (
    destination: string,
    destinationPlaceId: string,
    category: PlaceCategory
  ) => {
    setLoading(true);
    setCurrentSearch({ destination, destinationPlaceId, category });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/search/personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination,
          destinationPlaceId,
          category,
          additionalFilters: filters,
          usePreferences: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
      } else {
        console.error('Search failed:', data.error);
        alert(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (newFilters: Record<string, boolean>) => {
    setFilters(newFilters);
    // Re-run search with new filters if there's a current search
    if (currentSearch) {
      handleSearch(
        currentSearch.destination,
        currentSearch.destinationPlaceId,
        currentSearch.category
      );
    }
  };

  const handleSavePlace = async (placeId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/places/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          placeId,
          category: currentSearch?.category || 'other',
        }),
      });

      if (response.ok) {
        console.log('Place saved successfully');
      }
    } catch (error) {
      console.error('Error saving place:', error);
    }
  };

  const handleViewDetails = (placeId: string) => {
    // TODO: Open details drawer/modal
    console.log('View details for place:', placeId);
  };

  const handleRatePlace = async (placeId: string, rating: number, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/places/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ placeId, rating, notes }),
      });
    } catch (error) {
      console.error('Error rating place:', error);
    }
  };

  const handleRemovePlace = (placeId: string) => {
    console.log('Removed place:', placeId);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="bg-espresso-light z-30 border-b border-espresso/30 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center rounded-lg">
                <MapPin className="w-6 h-6 text-espresso" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Loca</h1>
                <p className="text-xs text-white/80 -mt-1">AI-Powered Discovery</p>
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2 relative z-50">
              {/* #region agent log */}
              {(() => {
                fetch('http://127.0.0.1:7242/ingest/0b647a20-39da-41f8-8e58-123e4b9083c7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:162',message:'Rendering Saved button condition',data:{isAuthenticated,willRender:!!isAuthenticated},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D,E'})}).catch(()=>{});
                return null;
              })()}
              {/* #endregion */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowSavedDropdown(!showSavedDropdown)}
                  className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-all relative z-50"
                >
                  <Heart className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Saved</span>
                </button>
              )}
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setShowProfileDrawer(!showProfileDrawer)}
                    className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-all relative z-50"
                  >
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline font-medium">Profile</span>
                  </button>
                  <ProfileDrawer
                    isOpen={showProfileDrawer}
                    onClose={() => {
                      setShowProfileDrawer(false);
                      // Refresh auth state after closing (in case user just logged out)
                      const token = localStorage.getItem('token');
                      setIsAuthenticated(!!token);
                      if (!token) {
                        setUserProfile(null);
                      }
                    }}
                    user={userProfile ? {
                      name: userProfile.name,
                      email: userProfile.email,
                      subscription: userProfile.subscription,
                    } : undefined}
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowSignInDropdown(!showSignInDropdown)}
                    className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-all relative z-50"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="hidden sm:inline font-medium">Sign in</span>
                  </button>
                  <SignInDropdown
                    isOpen={showSignInDropdown}
                    onClose={() => {
                      setShowSignInDropdown(false);
                      // Refresh auth state after closing (in case user just logged in)
                      const token = localStorage.getItem('token');
                      setIsAuthenticated(!!token);
                      if (token) {
                        // Fetch user profile
                        fetch('/api/auth/me', {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        })
                          .then((res) => res.json())
                          .then((data) => {
                            if (data.user) {
                              setUserProfile(data.user);
                            }
                          })
                          .catch(console.error);
                      }
                    }}
                    onOpenSignUp={() => setShowSignUpDrawer(true)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Map container with floating search */}
      <div className="flex-1 relative bg-gray-200">
        {/* Map placeholder - will be replaced with actual map */}
        <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Map will load here</p>
          </div>
        </div>

        {/* Floating search container */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
          <SearchBar 
            onSearch={handleSearch} 
            onOpenFilters={() => {}}
            onApplyFilters={handleApplyFilters}
            currentFilters={filters}
          />
        </div>

        {/* Results dropdown overlay */}
        {loading && (
          <div className="absolute inset-x-0 top-32 flex justify-center px-4 z-10">
            <div className="bg-white border border-espresso/20 rounded-xl p-8 w-full max-w-2xl shadow-lg">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-12 h-12 border-4 border-espresso/20 border-t-espresso rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-bold text-espresso mb-1">
                  Finding your perfect matches...
                </h3>
                <p className="text-sm text-espresso/70">AI is analyzing your preferences</p>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="absolute inset-x-0 top-32 bottom-0 flex justify-center px-4 z-10">
            <div className="bg-white border border-espresso/20 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col shadow-lg">
              {/* Results header */}
              <div className="p-4 border-b border-espresso/10 bg-offwhite">
                <h2 className="text-lg font-bold text-charcoal">
                  {results.length} place{results.length !== 1 ? 's' : ''} found
                </h2>
                {currentSearch && (
                  <p className="text-sm text-espresso font-medium">
                    {currentSearch.category} in <span className="font-bold">{currentSearch.destination}</span>
                  </p>
                )}
              </div>

              {/* Results list */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {results.map((result) => (
                    <ResultCard
                      key={result.place.id}
                      result={result}
                      onSave={handleSavePlace}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved places dropdown */}
      <div className="relative">
        <SavedPlacesDropdown
          isOpen={showSavedDropdown}
          onClose={() => setShowSavedDropdown(false)}
          onRate={handleRatePlace}
          onRemove={handleRemovePlace}
        />
      </div>

      {/* Sign up drawer */}
      <SignUpDrawer
        isOpen={showSignUpDrawer}
        onClose={() => {
          setShowSignUpDrawer(false);
          // Refresh auth state after closing (in case user just signed up)
          const token = localStorage.getItem('token');
          setIsAuthenticated(!!token);
          if (token) {
            // Fetch user profile
            fetch('/api/auth/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.user) {
                  setUserProfile(data.user);
                }
              })
              .catch(console.error);
          }
        }}
        onOpenSignIn={() => setShowSignInDropdown(true)}
      />

    </div>
  );
}
