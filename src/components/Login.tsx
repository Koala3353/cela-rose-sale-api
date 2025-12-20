import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

interface LoginProps {
  onSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { user, isLoading, renderGoogleButton, signIn } = useAuth();

  // Render Google button when component mounts
  useEffect(() => {
    renderGoogleButton('google-signin-button');
  }, [renderGoogleButton]);

  // Call onSuccess when user logs in
  useEffect(() => {
    if (user && onSuccess) {
      onSuccess();
    }
  }, [user, onSuccess]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-rose-50 to-white px-4 py-12">
      {/* Floating Roses Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl opacity-10"
            style={{
              left: `${15 + i * 20}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            🌹
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="relative max-w-md w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl shadow-rose-200/50 border border-rose-100">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <motion.div 
              className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-rose-200"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className="text-4xl">🌹</span>
            </motion.div>
            
            <motion.h2 
              className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Welcome Back
            </motion.h2>
            
            <motion.p 
              className="text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Sign in to access your account and order history
            </motion.p>
          </div>
          
          {/* Auth Section */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {user ? (
              /* Logged In State */
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="inline-flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <img 
                    src={user.photoURL || ''} 
                    alt={user.displayName || ''} 
                    className="w-14 h-14 rounded-full ring-4 ring-white shadow-lg" 
                  />
                  <div className="text-left">
                    <p className="font-semibold text-lg text-gray-800">{user.displayName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Successfully signed in</span>
                </div>
              </motion.div>
            ) : (
              /* Sign In State */
              <>
                {/* Google Sign-In Button Container */}
                <div className="flex flex-col items-center justify-center">
                  <div id="google-signin-button" className="flex justify-center"></div>
                  {isLoading && (
                    <div className="flex items-center justify-center py-4">
                      <span className="w-6 h-6 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin"></span>
                      <span className="ml-3 text-gray-600">Signing in...</span>
                    </div>
                  )}
                </div>
                
                {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-rose-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white text-sm text-gray-500">or continue with</span>
                  </div>
                </div>
                
                {/* Fallback Sign In Button */}
                <motion.button
                  onClick={signIn}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </motion.button>
              </>
            )}
          </motion.div>
          
          {/* Security Badge */}
          <motion.div 
            className="mt-8 pt-6 border-t border-rose-100 flex items-center justify-center gap-2 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure login for students</span>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-rose-200 to-pink-200 rounded-full blur-2xl opacity-60"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full blur-2xl opacity-60"></div>
      </motion.div>
    </div>
  );
};

export default Login;