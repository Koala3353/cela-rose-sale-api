import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { Link } from 'react-router-dom';

interface SuggestionToastProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
}

const SuggestionToast: React.FC<SuggestionToastProps> = ({ isOpen, onClose, product }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed bottom-6 right-6 z-50 w-[90vw] md:w-auto md:max-w-sm"
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col relative">
                        {/* Close button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="absolute top-2 right-2 z-10 p-1 bg-white/50 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-800"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2">
                            <p className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                ✨ You might also like
                            </p>
                        </div>

                        <Link to={`/product/${product.id}`} className="flex p-4 gap-4 items-center group hover:bg-rose-50/50 transition-colors">
                            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-rose-100">
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-800 text-sm truncate group-hover:text-rose-600 transition-colors">
                                    {product.name}
                                </h4>
                                {product.category && (
                                    <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                    <span className="font-bold text-rose-600">₱{product.price.toFixed(2)}</span>
                                    <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-full font-medium">Check it out →</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SuggestionToast;
