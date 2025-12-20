import { useState, useMemo, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import CartDrawer from '../components/CartDrawer';
import { useCart } from '../context/CartContext';
import { fetchProducts, trackPageView, ProductsResult } from '../services/sheetService';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import RoseLoader from '../components/RoseLoader';

import SuggestionToast from '../components/SuggestionToast';
import BundleSelectionModal from '../components/BundleSelectionModal';

const PRODUCTS_PER_PAGE = 12;
const SUGGESTION_DELAY = 15000; // 15 seconds
const SUGGESTION_SESSION_KEY = 'rose_sale_suggestion_seen';

const ShopPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const { addToCart, setIsCartOpen } = useCart();

  // Suggestion State
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestedProduct, setSuggestedProduct] = useState<Product | null>(null);

  // Bundle Modal State
  const [selectedBundle, setSelectedBundle] = useState<Product | null>(null);

  const handleQuickAdd = (product: Product) => {
    if (product.bundleItems) {
      setSelectedBundle(product);
    } else {
      addToCart(product);
      setIsCartOpen(true);
    }
  };

  const { data: productsResult, isLoading, error } = useQuery<ProductsResult, Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const products = productsResult?.products;
  const isFallback = productsResult?.isFallback ?? false;
  const isExpiredCache = productsResult?.isExpiredCache ?? false;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Track shop page view
  useEffect(() => {
    trackPageView('shop');
  }, []);

  // Random Suggestion Logic
  useEffect(() => {
    // Only run if products are loaded and we haven't shown a suggestion yet
    if (!products || products.length === 0 || isLoading) return;

    // Check session storage
    const hasSeenSuggestion = sessionStorage.getItem(SUGGESTION_SESSION_KEY);
    if (hasSeenSuggestion) return;

    const timer = setTimeout(() => {
      // Pick a random product
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      setSuggestedProduct(randomProduct);
      setShowSuggestion(true);

      // Mark as seen
      sessionStorage.setItem(SUGGESTION_SESSION_KEY, 'true');
    }, SUGGESTION_DELAY);

    return () => clearTimeout(timer);
  }, [products, isLoading]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  // Extract unique categories
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = [...new Set(products.map((p) => p.category))].filter(Boolean);
    return cats.sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort
    switch (sortBy) {
      case 'price-asc':
        filtered = filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered = filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
      default:
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 my-6">
        <motion.button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50'
            }`}
          whileHover={currentPage !== 1 ? { scale: 1.02 } : {}}
          whileTap={currentPage !== 1 ? { scale: 0.98 } : {}}
        >
          ← Previous
        </motion.button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first, last, current, and adjacent pages
            const showPage = page === 1 || page === totalPages ||
              Math.abs(page - currentPage) <= 1;
            const showEllipsis = page === 2 && currentPage > 3 ||
              page === totalPages - 1 && currentPage < totalPages - 2;

            if (showEllipsis) {
              return <span key={page} className="px-2 text-gray-400">...</span>;
            }

            if (!showPage) return null;

            return (
              <motion.button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${page === currentPage
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200'
                  : 'bg-white border border-rose-200 text-gray-600 hover:bg-rose-50'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {page}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50'
            }`}
          whileHover={currentPage !== totalPages ? { scale: 1.02 } : {}}
          whileTap={currentPage !== totalPages ? { scale: 0.98 } : {}}
        >
          Next →
        </motion.button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-50 pt-20 md:pt-24">
      <CartDrawer />

      {/* Random Product Suggestion Toast */}
      {suggestedProduct && (
        <SuggestionToast
          isOpen={showSuggestion}
          onClose={() => setShowSuggestion(false)}
          product={suggestedProduct}
        />
      )}

      {/* Fallback/Expired Cache Warning Banner */}
      {(isFallback || isExpiredCache) && (
        <motion.div
          className="bg-amber-50 border-b border-amber-200"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-amber-800 font-medium text-sm">
                  {isFallback
                    ? "⚠️ Showing backup product list - items may be outdated"
                    : "⚠️ Unable to fetch latest products - showing cached data"
                  }
                </p>
                <p className="text-amber-600 text-xs mt-0.5">
                  If this issue persists, please contact support via our{' '}
                  <a
                    href="https://www.facebook.com/CeladonRoseSale/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-800"
                  >
                    Facebook page
                  </a>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      <motion.div
        className="relative py-12 md:py-20 px-4 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 rose-pattern opacity-20" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.h1
            className="text-4xl md:text-6xl font-playfair font-bold mb-4"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="gradient-text">Our Collection</span>
          </motion.h1>
          <motion.p
            className="text-gray-600 text-lg max-w-2xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Discover our handcrafted rose arrangements, perfect for every special moment
          </motion.p>
        </div>
      </motion.div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <motion.div
          className="glass rounded-2xl p-4 md:p-6 shadow-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search roses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>

            {/* Category Filter */}
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="md:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-field"
              >
                <option value="name">Sort by Name</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedCategory !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-800">
                    ×
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('all')} className="hover:text-rose-800">
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-sm text-gray-500 hover:text-rose-600"
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RoseLoader size="lg" message="Loading our beautiful roses..." />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-rose-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-600 text-lg">Oops! Something went wrong.</p>
            <p className="text-gray-400">Please try refreshing the page.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-rose-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 text-lg">No roses found</p>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-500">
                Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </p>
            </div>

            {/* Top Pagination */}
            <Pagination />

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              layout
            >
              <AnimatePresence mode="popLayout">
                {paginatedProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onQuickAdd={handleQuickAdd}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Bottom Pagination */}
            <Pagination />

            {/* Bundle Selection Modal */}
            <AnimatePresence>
              {selectedBundle && (
                <BundleSelectionModal
                  product={selectedBundle}
                  isOpen={!!selectedBundle}
                  onClose={() => setSelectedBundle(null)}
                  onAddToCart={(item) => {
                    addToCart(item);
                    setSelectedBundle(null);
                    setIsCartOpen(true);
                  }}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default ShopPage;