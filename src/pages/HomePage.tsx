import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, useMemo, lazy, Suspense, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, trackPageView, ProductsResult } from '../services/sheetService';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import RunningAnimation from '../components/RunningAnimation';
import BundleSelectionModal from '../components/BundleSelectionModal';

// Optimized floating petal - reduced complexity
const FloatingPetal = ({ delay, left }: { delay: number; left: string }) => {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return null;

  return (
    <div
      className="petal text-rose-300"
      style={{
        left,
        animationDelay: `${delay}s`,
        animationDuration: '12s'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 9 9.5 11 12 11C14.5 11 16.5 9 16.5 6.5C16.5 4 14.5 2 12 2Z" />
      </svg>
    </div>
  );
};

// Product card component for reuse
const ProductCard = ({ product, index, showStock = false, onQuickAdd }: { product: Product; index: number; showStock?: boolean; onQuickAdd: (p: Product) => void }) => {
  return (
    <motion.div
      className="product-card group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <div className="relative aspect-square bg-gradient-to-br from-rose-50 to-pink-50 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-rose-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.7 3.7-.4.5-.7 1.1-.7 1.8 0 1.5 1.3 2.8 2.8 2.8.3 0 .5 0 .7-.1v5.3c0 1 .8 2 2 2s2-1 2-2v-5.3c.2.1.5.1.7.1 1.5 0 2.8-1.3 2.8-2.8 0-.7-.3-1.3-.7-1.8 1-1 1.7-2.2 1.7-3.7C16.5 4 14.5 2 12 2z" />
            </svg>
          </div>
        )}
        {showStock && product.stock <= 20 && (
          <span className="absolute top-3 right-3 px-3 py-1 bg-rose-500 text-white text-xs font-semibold rounded-full shadow-lg">
            Only {product.stock} left!
          </span>
        )}
        {product.category && !showStock && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full">
            {product.category}
          </span>
        )}
        {/* Quick add overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.preventDefault(); onQuickAdd(product); }}
            className="px-4 py-2 bg-white text-rose-600 rounded-full font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
          >
            {product.bundleItems ? 'Customize' : 'Quick Add'}
          </button>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-800 text-lg truncate">{product.name}</h3>
        {!showStock && product.description && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xl font-bold text-rose-600">₱{product.price.toFixed(0)}</span>
          <Link to={`/product/${product.id}`}>
            <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-full transition-colors">
              View
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// Animated counter component for stats
const AnimatedCounter = ({ value }: { value: string }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Extract numeric value and suffix
  const numericValue = parseInt(value.replace(/\D/g, '')) || 0;
  const suffix = value.replace(/^\d+/, '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated && numericValue > 0) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = numericValue / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
              setCount(numericValue);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [numericValue, hasAnimated]);

  // Handle non-numeric values (e.g., "24hr" or "100%")
  if (!/^\d+/.test(value)) return <span>{value}</span>;

  return <span ref={ref}>{hasAnimated ? count : 0}{suffix}</span>;
};

// Stats data
const stats = [
  { value: '500+', label: 'Happy Customers' },
  { value: '50+', label: 'Rose Varieties' },
  { value: '24hr', label: 'Delivery Time' },
  { value: '100%', label: 'Fresh Guarantee' },
];

// Testimonials data
const testimonials = [
  {
    name: 'Maria Santos',
    role: 'Verified Buyer',
    content: 'The roses were absolutely stunning! Fresh, vibrant, and beautifully arranged. My mom loved them!',
    rating: 5,
  },
  {
    name: 'Juan dela Cruz',
    role: 'Verified Buyer',
    content: 'Fast delivery and excellent quality. The personalized message card was a nice touch. Will order again!',
    rating: 5,
  },
  {
    name: 'Ana Reyes',
    role: 'Verified Buyer',
    content: 'Best rose shop in town! The prices are reasonable and the flowers last for weeks. Highly recommend!',
    rating: 5,
  },
];

const HomePage = () => {
  const shouldReduceMotion = useReducedMotion();
  const [petals, setPetals] = useState<{ id: number; delay: number; left: string }[]>([]);

  // Modal State
  const [selectedBundle, setSelectedBundle] = useState<Product | null>(null);
  const { addToCart } = useCart();

  const handleQuickAdd = (product: Product) => {
    if (product.bundleItems) {
      setSelectedBundle(product);
    } else {
      addToCart(product);
    }
  };

  // Fetch products for featured section
  const { data: productsResult, isLoading } = useQuery<ProductsResult, Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const products = productsResult?.products;

  // Get featured products (low stock items - selling fast!)
  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p.stock > 0 && p.stock <= 20)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 4);
  }, [products]);

  // Get popular products (ensure at least 1 bundle is shown)
  const popularProducts = useMemo(() => {
    if (!products) return [];

    // Filter out already featured items
    const featuredIds = new Set(featuredProducts.map(p => p.id));
    const available = products.filter(p => p.stock > 0 && !featuredIds.has(p.id));

    // Separate bundles and non-bundles
    const bundles = available.filter(p => p.category === 'Bundles' || p.bundleItems);
    const nonBundles = available.filter(p => p.category !== 'Bundles' && !p.bundleItems);

    let result: Product[] = [];

    // 1. Try to add one random bundle first
    if (bundles.length > 0) {
      const randomBundleIndex = Math.floor(Math.random() * bundles.length);
      result.push(bundles[randomBundleIndex]);
      // Remove used bundle from further selection if we were to pick more (though here we mix with non-bundles)
    }

    // 2. Fill the rest with non-bundles (shuffled)
    const shuffledNonBundles = [...nonBundles].sort(() => Math.random() - 0.5);
    const needed = 4 - result.length;

    result = [...result, ...shuffledNonBundles.slice(0, needed)];

    // 3. If we still don't have 4, fill with remaining bundles or heavily stocked items
    if (result.length < 4) {
      const usedIds = new Set(result.map(p => p.id));
      const remBundles = bundles.filter(p => !usedIds.has(p.id));
      const remOthers = products.filter(p => !usedIds.has(p.id) && !featuredIds.has(p.id));

      const filler = [...remBundles, ...remOthers].slice(0, 4 - result.length);
      result = [...result, ...filler];
    }

    // Shuffle the final result so the bundle isn't always first
    return result.sort(() => Math.random() - 0.5);
  }, [products, featuredProducts]);

  useEffect(() => {
    // Reduced number of petals for better performance
    if (!shouldReduceMotion) {
      const newPetals = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        delay: i * 1.5,
        left: `${(i * 12.5) + Math.random() * 5}%`,
      }));
      setPetals(newPetals);
    }

    trackPageView('home');
  }, [shouldReduceMotion]);

  // Animation variants for sections
  const sectionVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - Full viewport with modern gradient */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-pink-50" />
        <div className="absolute inset-0 rose-pattern opacity-20" />

        {/* Floating petals - reduced for performance */}
        {petals.map((petal) => (
          <FloatingPetal key={petal.id} delay={petal.delay} left={petal.left} />
        ))}

        {/* Decorative blurred shapes */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-rose-200 to-pink-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-pink-200 to-rose-300 rounded-full opacity-20 blur-3xl" />

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100/80 backdrop-blur-sm text-rose-600 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              Now Accepting Orders for 2026
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-playfair font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="gradient-text">Rose Sale</span>
            <br className="sm:hidden" />
            <span className="text-rose-600"> 2026</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="text-xl md:text-2xl lg:text-3xl text-gray-600 mb-4 font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Exquisite bouquets for every occasion
          </motion.p>

          {/* Subtitle */}
          <motion.p
            className="text-base md:text-lg text-gray-500 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Handcrafted with love, delivered with care. Make every moment special with our premium rose collections.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to="/shop">
              <button className="btn-primary text-lg px-10 py-4 flex items-center gap-2 group">
                <span>Shop Now</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
            <Link to="/shop">
              <button className="btn-secondary text-lg px-10 py-4">
                View Collection
              </button>
            </Link>
          </motion.div>


        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ duration: 1.5, delay: 1, repeat: Infinity }}
        >
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </section>

      {/* Features Strip */}
      <section className="py-16 bg-white border-y border-rose-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {[
              {
                icon: (
                  <svg className="w-10 h-10 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Fresh Roses',
                desc: 'Handpicked daily'
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
                title: 'Gift Wrapped',
                desc: 'Beautifully packaged'
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Fast Delivery',
                desc: 'Same-day available'
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: 'Personal Notes',
                desc: 'Custom messages'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="text-center"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <div className="mb-3 flex justify-center">{feature.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-1">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Products - Selling Fast */}
      {featuredProducts.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-white to-rose-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={sectionVariants}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-600 rounded-full text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                Selling Fast
              </span>
              <h2 className="text-3xl md:text-4xl font-playfair font-bold text-gray-800 mb-3">
                Limited Stock Available
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                These roses are flying off the shelves! Grab them before they're gone.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: { opacity: 1, scale: 1 }
                }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-rose-100 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={sectionVariants}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-playfair font-bold text-gray-800 mb-3">
                Popular Picks
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Our most loved rose arrangements, handpicked for you.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to="/shop">
                <button className="btn-secondary text-lg px-10 py-4">
                  View All Products
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-20 bg-rose-50/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionVariants}
          >
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-gray-800 mb-3">
              How It Works
            </h2>
            <p className="text-gray-500">Sending roses has never been easier</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.15 } }
            }}
          >
            {[
              {
                step: '1',
                title: 'Choose Your Roses',
                desc: 'Browse our collection and pick your favorites',
                icon: (
                  <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: 'Add Your Message',
                desc: 'Include a heartfelt note for your recipient',
                icon: (
                  <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )
              },
              {
                step: '3',
                title: 'We Deliver',
                desc: 'Your roses are hand-delivered with care',
                icon: (
                  <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                )
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="text-center"
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 text-xl mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionVariants}
          >
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-gray-800 mb-3">
              What Our Customers Say
            </h2>
            <p className="text-gray-500">Real reviews from happy customers</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                className="bg-rose-50/50 rounded-2xl p-6 relative"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                {/* Quote mark */}
                <div className="absolute top-4 right-4 text-rose-200 text-5xl font-serif">"</div>

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-gray-600 mb-6 relative z-10">"{testimonial.content}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-200 rounded-full flex items-center justify-center text-rose-600 font-semibold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionVariants}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-playfair font-bold mb-4">
                Ready to Spread Some Love?
              </h2>
              <p className="text-lg md:text-xl text-rose-100 max-w-xl mx-auto mb-8">
                Make someone's day special with a beautiful rose arrangement. Order now and brighten their world.
              </p>
              <Link to="/shop">
                <button className="bg-white text-rose-600 hover:bg-rose-50 px-12 py-4 rounded-full text-lg font-semibold transition-colors shadow-lg">
                  Start Shopping
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bundle Modal */}
      <BundleSelectionModal
        isOpen={!!selectedBundle}
        onClose={() => setSelectedBundle(null)}
        product={selectedBundle}
      />

      {/* Running Animation Overlay */}
      <RunningAnimation />
    </div>
  );
};

export default HomePage;