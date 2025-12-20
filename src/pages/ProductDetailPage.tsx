import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProducts, fetchAllProducts, ProductsResult, trackPageView } from '../services/sheetService';
import { useCart } from '../context/CartContext';
import RoseLoader from '../components/RoseLoader';
import NotFound from './NotFound';
import { parseBundleString, formatOptionName, getRelatedBundles, BundleSlot } from '../utils/bundleHelpers';
import UpsellModal from '../components/UpsellModal';
import BundleConfigurator from '../components/BundleConfigurator';

const ProductDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart, setIsCartOpen } = useCart();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    // Bundle State
    const [isBundleReady, setIsBundleReady] = useState(false);
    const [bundleDetails, setBundleDetails] = useState('');

    // Upsell State
    const [showUpsell, setShowUpsell] = useState(false);
    const [upsellBundle, setUpsellBundle] = useState<any>(null);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    const { data: productsResult, isLoading, error } = useQuery<ProductsResult, Error>({
        queryKey: ['products'],
        queryFn: fetchProducts,
    });

    // Fetch ALL products (including unavailable) for bundle option lookups
    const { data: allProductsResult } = useQuery<ProductsResult, Error>({
        queryKey: ['products-all'],
        queryFn: fetchAllProducts,
    });

    const products = productsResult?.products || [];
    const allProducts = allProductsResult?.products || products; // Fallback to available products if not loaded
    const product = products.find((p) => p.id === id);

    // Reset bundle state when product changes
    useEffect(() => {
        setIsBundleReady(false);
        setBundleDetails('');
    }, [product]);

    // Check for Upsell opportunities
    useEffect(() => {
        if (product && !product.bundleItems && products.length > 0) {
            const relatedBundles = getRelatedBundles(product, products);
            if (relatedBundles.length > 0) {
                // Pick the first relevant bundle (or random)
                setUpsellBundle(relatedBundles[0]);
            }
        }
    }, [product, products]);

    // Track page view
    useEffect(() => {
        if (product) {
            trackPageView('product', product.id);
        }
    }, [product]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-rose-50 flex items-center justify-center pt-20">
                <RoseLoader size="lg" message="Loading product details..." />
            </div>
        );
    }

    if (error || !product) {
        return <NotFound />;
    }


    const handleAddToCart = () => {
        if (product.stock === 0) return;

        // If it's a regular product and we have an upsell available, show it first
        if (!product.bundleItems && upsellBundle) {
            setShowUpsell(true);
            return;
        }

        if (product.bundleItems && !isBundleReady) return;

        addToCart({
            ...product,
            // Pass the formatted bundle string as a special selected option or just construct the cart item with it
            // We'll pass it in selectedOptions as a special key for now, or rely on bundleDetails handling in global cart
            selectedOptions: product.bundleItems ? { 'bundle-details': bundleDetails } : undefined
        });

        setIsAdded(true);
        setTimeout(() => {
            setIsAdded(false);
            setIsCartOpen(true);
        }, 800);
    };

    // Keep the "Add to Cart" logic for upsell refusal or direct add
    const confirmAddToCart = () => {
        addToCart(product);
        setIsAdded(true);
        setTimeout(() => {
            setIsAdded(false);
            setIsCartOpen(true);
        }, 800);
    }

    const getStockStatus = () => {
        if (product.stock === 0) return { text: 'Out of Stock', color: 'bg-gray-100 text-gray-500', dotColor: 'bg-gray-400' };
        if (product.stock < 5) return { text: `Only ${product.stock} left!`, color: 'bg-rose-100 text-rose-600', dotColor: 'bg-rose-500' };
        if (product.stock < 10) return { text: `${product.stock} left`, color: 'bg-amber-100 text-amber-600', dotColor: 'bg-amber-500' };
        return { text: 'In Stock', color: 'bg-green-100 text-green-600', dotColor: 'bg-green-500' };
    };

    const stockStatus = getStockStatus();

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-50 pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
                <UpsellModal
                    isOpen={showUpsell}
                    onClose={() => {
                        setShowUpsell(false);
                        confirmAddToCart(); // Add original item if they close upsell
                    }}
                    originalProduct={product}
                    bundle={upsellBundle || product} // Fallback to self (shouldn't happen)
                />

                {/* Breadcrumb / Back Button */}
                <div className="mb-8">
                    <Link
                        to="/shop"
                        className="inline-flex items-center text-rose-600 hover:text-rose-800 font-medium transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Shop
                    </Link>
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:gap-12">
                        {/* Image Section */}
                        <div className="bg-rose-50 relative aspect-square md:aspect-auto md:h-full min-h-[400px]">
                            {!imageLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <RoseLoader size="md" />
                                </div>
                            )}
                            <motion.img
                                src={product.imageUrl}
                                alt={product.name}
                                className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            />

                            {/* Category Badge on Image */}
                            {product.category && (
                                <div className="absolute top-6 left-6">
                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-sm font-semibold text-gray-800 shadow-sm">
                                        {product.category}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="p-8 md:p-12 flex flex-col justify-center">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {/* Stock Status Badge */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`w-2.5 h-2.5 rounded-full ${stockStatus.dotColor}`} />
                                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${stockStatus.color}`}>
                                        {stockStatus.text}
                                    </span>
                                </div>

                                <h1 className="text-4xl md:text-5xl font-playfair font-bold text-gray-900 mb-4 leading-tight">
                                    {product.name}
                                </h1>

                                <div className="text-3xl font-bold gradient-text mb-6">
                                    ₱{product.price.toFixed(2)}
                                </div>

                                <div className="prose prose-rose max-w-none mb-8">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                                    <p className="text-gray-600 leading-relaxed text-lg">
                                        {product.description || 'No description available for this beautiful arrangement.'}
                                    </p>
                                </div>

                                {/* Bundle Configuration UI */}
                                {product.bundleItems && (
                                    <div className="mb-8 p-6 bg-rose-50 rounded-2xl border border-rose-100">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <span className="text-xl">✨</span> Customize Your Bundle
                                        </h3>
                                        <BundleConfigurator
                                            product={product}
                                            allProducts={allProducts}
                                            onConfigChange={(valid, _, details) => {
                                                setIsBundleReady(valid);
                                                setBundleDetails(details);
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Tags */}
                                {product.tags && product.tags.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {product.tags.map((tag, i) => (
                                                <span key={i} className="text-sm px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                                    <motion.button
                                        onClick={handleAddToCart}
                                        disabled={product.stock === 0 || (!!product.bundleItems && !isBundleReady)}
                                        className={`flex-1 px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${product.stock === 0 || (!!product.bundleItems && !isBundleReady)
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-rose-200 hover:scale-[1.02]'
                                            }`}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                        {product.stock === 0
                                            ? 'Sold Out'
                                            : product.bundleItems && !isBundleReady
                                                ? 'Select Options'
                                                : 'Add to Cart'
                                        }
                                    </motion.button>
                                </div>

                                {/* Assurance */}
                                <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                                    <div className="p-4 bg-rose-50/50 rounded-xl">
                                        <span className="block text-2xl mb-1">🎁</span>
                                        <span className="text-sm text-gray-600 font-medium">Handcrafted with Love</span>
                                    </div>
                                    <div className="p-4 bg-rose-50/50 rounded-xl">
                                        <span className="block text-2xl mb-1">✨</span>
                                        <span className="text-sm text-gray-600 font-medium">Premium Quality</span>
                                    </div>
                                </div>

                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Added to Cart Overlay Animation */}
            <AnimatePresence>
                {isAdded && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                        <motion.div
                            className="bg-white rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col items-center"
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                        >
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-500">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">Added to Cart!</h3>
                            <p className="text-gray-500">{product.name} is in your bag.</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductDetailPage;
