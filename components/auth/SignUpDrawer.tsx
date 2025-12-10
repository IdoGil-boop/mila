'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, X, ArrowRight } from 'lucide-react';

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

interface SignUpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
}

export default function SignUpDrawer({ isOpen, onClose, onOpenSignIn }: SignUpDrawerProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleGoogleSignUp = useCallback(async (response: any) => {
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
        setError(data.error || 'Google sign-up failed');
        setGoogleLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      onClose();
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  }, [onClose, router]);

  useEffect(() => {
    if (!isOpen || !googleButtonRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Show message that Google Sign-Up is not configured
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">Google Sign-Up requires NEXT_PUBLIC_GOOGLE_CLIENT_ID</p>';
      }
      return;
    }

    const initGoogleSignUp = () => {
      if (window.google && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignUp,
          });
          
          // Clear previous button
          googleButtonRef.current.innerHTML = '';
          
          // Render button
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
          });
        } catch (error) {
          console.error('Error initializing Google Sign-Up:', error);
          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '<p class="text-xs text-red-400 text-center py-2">Failed to load Google Sign-Up</p>';
          }
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      initGoogleSignUp();
    } else {
      // Wait for script to load
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      const checkGoogle = setInterval(() => {
        attempts++;
        if (window.google) {
          clearInterval(checkGoogle);
          initGoogleSignUp();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkGoogle);
          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '<p class="text-xs text-yellow-400 text-center py-2">Google Sign-Up script failed to load</p>';
          }
        }
      }, 100);
    }
  }, [isOpen, handleGoogleSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Store token and redirect
      localStorage.setItem('token', data.token);
      onClose();
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
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
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-espresso">Create account</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
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

              {/* Google Sign-Up Button */}
              <div className="mb-6">
                <div ref={googleButtonRef} className="w-full min-h-[40px] flex items-center justify-center">
                  {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                    <p className="text-xs text-gray-400">Google Sign-Up not configured</p>
                  )}
                </div>
                {googleLoading && (
                  <div className="mt-2 text-center">
                    <div className="w-5 h-5 border-2 border-espresso/20 border-t-espresso rounded-full animate-spin mx-auto"></div>
                  </div>
                )}
              </div>

              {/* Divider */}
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                <div className="relative mb-6">
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
                {/* Name */}
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-espresso outline-none transition-all"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters</p>
                </div>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-espresso text-white rounded-lg font-medium
                           hover:bg-espresso-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 mt-6"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create account</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Sign in link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSignIn();
                    }}
                    className="text-espresso font-medium hover:underline"
                  >
                    Sign in
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

