'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Crown, X, Settings } from 'lucide-react';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name: string;
    email: string;
    subscription?: {
      tier: string;
    };
  };
}

export default function ProfileDrawer({ isOpen, onClose, user }: ProfileDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    onClose();
    window.location.reload();
  };

  const handleGoPremium = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
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
        alert('Failed to create checkout. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to create checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleManageProfile = () => {
    onClose();
    router.push('/profile');
  };

  const isPremium = user?.subscription?.tier === 'premium' || user?.subscription?.tier === 'pay_as_you_go';

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
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-espresso/20 shadow-xl z-50"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-espresso/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-espresso" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-espresso">{user?.name || 'User'}</h3>
                    <p className="text-xs text-gray-500">{user?.email || ''}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Menu items */}
              <div className="space-y-1">
                {/* Manage Profile */}
                <button
                  onClick={handleManageProfile}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>Manage profile</span>
                </button>

                {/* Go Premium - Highlighted */}
                {!isPremium && (
                  <motion.button
                    onClick={handleGoPremium}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg transition-all shadow-sm relative overflow-hidden"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>Go Premium</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

