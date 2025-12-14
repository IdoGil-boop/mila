'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, X } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

interface SignInDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignUp: () => void;
}

export default function SignInDropdown({ isOpen, onClose, onOpenSignUp }: SignInDropdownProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleGoogleSignIn = useCallback(async (response: any) => {
    setGoogleLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Google sign-in failed');
        setGoogleLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      onClose();
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }, [onClose, router]);

  useEffect(() => {
    if (!isOpen || !googleButtonRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Show message that Google Sign-In is not configured
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">Google Sign-In requires NEXT_PUBLIC_GOOGLE_CLIENT_ID</p>';
      }
      return;
    }

    const initGoogleSignIn = () => {
      if (window.google && googleButtonRef.current) {
        try {
          console.log('Initializing Google Sign-In with client ID:', clientId);
          console.log('Current origin:', window.location.origin);
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignIn,
          });
          
          // Clear previous button
          googleButtonRef.current.innerHTML = '';
          
          // Render button
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
          });
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error);
          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '<p class="text-xs text-red-400 text-center py-2">Failed to load Google Sign-In</p>';
          }
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      initGoogleSignIn();
    } else {
      // Wait for script to load
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      const checkGoogle = setInterval(() => {
        attempts++;
        if (window.google) {
          clearInterval(checkGoogle);
          initGoogleSignIn();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkGoogle);
          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '<p class="text-xs text-yellow-400 text-center py-2">Google Sign-In script failed to load</p>';
          }
        }
      }, 100);
    }
  }, [isOpen, handleGoogleSignIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token and redirect
      localStorage.setItem('token', data.token);
      onClose();
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
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
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
            style={{ pointerEvents: 'auto' }}
          />

          {/* Dropdown */}
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl border border-espresso/20 shadow-xl z-50"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-espresso">Sign in</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Google Sign-In Button */}
              <div className="mb-4">
                <div ref={googleButtonRef} className="w-full min-h-[40px] flex items-center justify-center">
                  {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                    <p className="text-xs text-gray-400">Google Sign-In not configured</p>
                  )}
                </div>
                {googleLoading && (
                  <div className="mt-2 text-center">
                    <div className="w-4 h-4 border-2 border-espresso/20 border-t-espresso rounded-full animate-spin mx-auto"></div>
                  </div>
                )}
              </div>

              {/* Divider */}
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all text-sm text-white placeholder:text-white/50 bg-gray-800"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                    <input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all text-sm text-white placeholder:text-white/50 bg-gray-800"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-espresso text-white rounded-lg font-medium
                           hover:bg-espresso-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 text-sm"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Sign up link */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSignUp();
                    }}
                    className="text-espresso font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

