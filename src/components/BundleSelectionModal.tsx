import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useQuery } from '@tanstack/react-query';
import { fetchAllProducts, ProductsResult } from '../services/sheetService';
import BundleConfigurator from './BundleConfigurator';

interface BundleSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

const BundleSelectionModal: React.FC<BundleSelectionModalProps> = ({ isOpen, onClose, product }) => {
    const { addToCart, setIsCartOpen } = useCart();
    const [isBundleReady, setIsBundleReady] = useState(false);
    const [bundleDetails, setBundleDetails] = useState('');

    // Fetch ALL products (including unavailable) for bundle option lookups
    // This ensures we can display correct product names even for unavailable items
    const { data: productsResult } = useQuery<ProductsResult, Error>({
        queryKey: ['products-all'],
        queryFn: fetchAllProducts,
        enabled: isOpen, // Only fetch if modal is open (usually already cached)
    });

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setIsBundleReady(false);
            setBundleDetails('');
        }
    }, [isOpen, product]);

    const handleAddToCart = () => {
        if (!product) return;

        addToCart({
            ...product,
            selectedOptions: { 'bundle-details': bundleDetails }
        });

        onClose();
        setIsCartOpen(true);
    };

    if (!isOpen || !product) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative z-10"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-rose-100 sticky top-0 bg-white z-20 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-playfair font-bold text-gray-800">Customize Bundle</h3>
                                <p className="text-rose-600 font-medium">{product.name}</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Product Image Preview (Tiny) */}
                            <div className="flex items-center gap-4 bg-rose-50 p-3 rounded-xl">
                                <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                                <div>
                                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                                </div>
                            </div>

                            {/* Configurator */}
                            <BundleConfigurator
                                product={product}
                                allProducts={productsResult?.products || []}
                                onConfigChange={(valid, _, details) => {
                                    setIsBundleReady(valid);
                                    setBundleDetails(details);
                                }}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-rose-100 bg-gray-50 sticky bottom-0 z-20">
                            <button
                                onClick={handleAddToCart}
                                disabled={!isBundleReady}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${!isBundleReady
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-rose-200 hover:scale-[1.02]'
                                    }`}
                            >
                                {isBundleReady ? 'Add to Bundle' : 'Select All Options'}
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BundleSelectionModal;
