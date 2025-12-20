import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import NotFound from './pages/NotFound';
import ProductDetailPage from './pages/ProductDetailPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CheckoutForm from './components/CheckoutForm';
import LoginModal from './components/LoginModal';
import OrderHistory from './components/OrderHistory';

const queryClient = new QueryClient();

function AppContent() {
  const [showCheckout, setShowCheckout] = useState(false);
  const { isCartOpen, setIsCartOpen } = useCart();
  const { showLoginModal, setShowLoginModal } = useAuth();
  const location = useLocation();

  // Reset checkout view when navigating to a different page
  useEffect(() => {
    setShowCheckout(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          setShowCheckout(true);
        }}
      />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <main className="flex-grow">
        {showCheckout ? (
          <CheckoutForm onBack={() => setShowCheckout(false)} />
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  // Handle redirect from 404.html hack (GitHub Pages SPA)
  // If we arrived here via a redirect (e.g. /shop), the path will be in query params or we need to check pathname manually if 404 handled it.
  // Since we use HashRouter, we should check if window.location.pathname has extra segments and move them to hash.
  useEffect(() => {
    const path = window.location.pathname;
    const basename = '/celadon-rose-sale';
    if (path.startsWith(basename) && path !== basename && path !== basename + '/') {
      const rest = path.substring(basename.length);
      console.log('Redirecting path to hash:', rest);
      window.location.replace(`${basename}/#${rest}`);
    } else if (!path.startsWith(basename) && path.length > 1) {
      // Localhost or different base
      console.log('Redirecting root path to hash:', path);
      window.location.hash = path;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;