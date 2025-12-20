import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { StickmanConfused } from './StickmanComponents';
import { formatOptionName } from '../utils/bundleHelpers';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onCheckout }) => {
  const { cart, removeFromCart, clearCart } = useCart();
  const { user, setShowLoginModal } = useAuth();

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (!user) {
      // Show login modal if not signed in
      setShowLoginModal(true);
      return;
    }
    onCheckout();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-gradient-to-b from-white to-rose-50 shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="p-6 border-b border-rose-100 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🛒</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
                    <p className="text-sm text-gray-500">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-rose-100 flex items-center justify-center transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-grow overflow-y-auto p-6">
              {cart.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-32 h-32 flex items-center justify-center mb-2">
                    <StickmanConfused className="w-full h-full text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Where are the roses?</h3>
                  <p className="text-gray-500 mb-6">I'm ready to carry your beautiful flowers!</p>
                  <motion.button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-medium shadow-lg shadow-rose-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Browse Roses
                  </motion.button>
                </motion.div>
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence>
                    {cart.map((item, index) => (
                      <motion.li
                        key={item.cartItemId}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100 hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50, height: 0 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <div className="flex gap-4">
                          {/* Product Image */}
                          <Link
                            to={`/product/${item.id}`}
                            onClick={onClose}
                            className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-3xl">🌹</span>
                            )}
                          </Link>

                          {/* Product Details */}
                          <div className="flex-grow min-w-0">
                            <Link to={`/product/${item.id}`} onClick={onClose}>
                              <h3 className="font-semibold text-gray-800 truncate hover:text-rose-600 transition-colors">{item.name}</h3>
                            </Link>
                            <p className="text-rose-600 font-bold text-lg">
                              ₱{item.price.toFixed(2)}
                              {item.quantity > 1 && <span className="text-sm font-medium text-gray-500 ml-2">x{item.quantity}</span>}
                            </p>
                            {item.category && (
                              <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-600 text-xs rounded-full mt-1">
                                {item.category}
                              </span>
                            )}

                            {/* Selected Options for Bundles */}
                            {item.selectedOptions && Object.values(item.selectedOptions).length > 0 && (
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                {Object.values(item.selectedOptions).map((opt, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <span className="w-1 h-1 bg-rose-400 rounded-full" />
                                    {formatOptionName(opt as string)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Remove Button */}
                          <motion.button
                            onClick={() => removeFromCart(item.cartItemId!)}
                            className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors flex-shrink-0"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </motion.button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <motion.div
                className="p-6 border-t border-rose-100 bg-white/90 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Subtotal */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="h-px bg-rose-200 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-800">Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sign In Notice */}
                {!user && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-amber-700">Please sign in to checkout</span>
                  </div>
                )}

                {/* Checkout Button */}
                <motion.button
                  onClick={handleCheckout}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {user ? 'Proceed to Checkout' : 'Sign In to Checkout'}
                </motion.button>

                {!user && (
                  <button
                    onClick={onCheckout}
                    className="w-full mt-3 py-3 text-rose-500 hover:text-rose-600 font-medium transition-colors text-sm hover:underline"
                  >
                    Or continue as Guest
                  </button>
                )}

                {/* Clear Cart */}
                <motion.button
                  onClick={clearCart}
                  className="w-full mt-3 py-3 text-gray-500 hover:text-red-500 font-medium transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Cart
                </motion.button>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 mt-4 text-gray-400 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure checkout</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;