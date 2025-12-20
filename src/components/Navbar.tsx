import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { cart, setIsCartOpen } = useCart();
  const { user, signIn, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
  ];

  // Add Order History link (Track for Guest, My Orders for User)
  const userLinks = [
    ...navLinks,
    { path: '/orders', label: user ? 'My Orders' : 'Track Order' },
  ];

  return (
    <>
      <motion.nav
        className="fixed w-full top-0 z-40 glass shadow-lg"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div
                className="w-10 h-10"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}assets/logo.png`}
                  alt="Rose Sale Logo"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <span className="text-xl md:text-2xl font-playfair font-bold gradient-text">
                Rose Sale 2026
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {userLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-base font-medium transition-colors ${location.pathname === link.path
                    ? 'text-rose-600'
                    : 'text-gray-600 hover:text-rose-500'
                    }`}
                >
                  {link.label}
                  {location.pathname === link.path && (
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-full"
                      layoutId="navbar-indicator"
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Cart Button */}
              <motion.button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 md:p-3 rounded-full bg-rose-50 hover:bg-rose-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <motion.span
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    key={totalItems}
                  >
                    {totalItems}
                  </motion.span>
                )}
              </motion.button>

              {/* Auth Button - Desktop */}
              <div className="hidden md:block">
                {user ? (
                  <div className="flex items-center gap-3">
                    {user.photoURL && (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-9 h-9 rounded-full border-2 border-rose-200"
                      />
                    )}
                    <motion.button
                      onClick={signOut}
                      className="btn-secondary text-sm px-4 py-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign Out
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={signIn}
                    className="btn-primary text-sm px-6 py-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Sign In
                  </motion.button>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-rose-50 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed top-16 left-0 right-0 bg-white shadow-xl z-30 md:hidden rounded-b-3xl overflow-hidden"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="p-6 space-y-4">
                {userLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block text-lg font-medium py-2 ${location.pathname === link.path
                      ? 'text-rose-600'
                      : 'text-gray-700 hover:text-rose-500'
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 border-t border-rose-100">
                  {user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {user.photoURL && (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-10 h-10 rounded-full border-2 border-rose-200"
                          />
                        )}
                        <span className="text-gray-700 font-medium">{user.displayName}</span>
                      </div>
                      <button
                        onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                        className="text-rose-600 font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { signIn(); setIsMobileMenuOpen(false); }}
                      className="w-full btn-primary py-3"
                    >
                      Sign In with Google
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;