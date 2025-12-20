import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, isLoading, renderGoogleButton } = useAuth();

  // Render Google button when modal opens
  useEffect(() => {
    if (isOpen && !user) {
      // Small delay to ensure the container is mounted
      const timer = setTimeout(() => {
        renderGoogleButton('google-signin-modal-button');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user, renderGoogleButton]);

  // Close modal when user logs in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >

              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden z-10">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-rose-100 flex items-center justify-center transition-colors z-10"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Decorative header */}
                <div className="bg-gradient-to-br from-rose-400 to-pink-500 px-8 py-10 text-center text-white">
                  <motion.div
                    className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                  >
                    <span className="text-4xl">🌹</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to Rose Sale 2026</h2>
                  <p className="text-white/80 text-sm">Sign in to place orders and track deliveries</p>
                </div>

                {/* Content */}
                <div className="px-8 py-8">
                  {/* Loading indicator - shown above buttons when loading */}
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center py-4 mb-4">
                      <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-600">Signing you in...</p>
                    </div>
                  )}

                  {/* Google Sign-In Button - always render container, hide when loading */}
                  <div className={`flex justify-center mb-6 transition-opacity ${isLoading ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    <div id="google-signin-modal-button"></div>
                  </div>

                  {!isLoading && (
                    <>
                      {/* Divider */}
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-white text-gray-500">Secure sign-in</span>
                        </div>
                      </div>

                      {/* Info text */}
                      <div className="text-center text-sm text-gray-500 space-y-2">
                        <p className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Quick and secure Google authentication
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Your data is protected
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
