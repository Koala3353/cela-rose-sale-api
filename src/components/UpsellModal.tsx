import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { Link } from 'react-router-dom';

interface UpsellModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalProduct: Product;
    bundle: Product;
}

const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose, originalProduct, bundle }) => {
    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    >
                        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white text-center">
                            <h3 className="text-2xl font-bold font-playfair mb-1">Wait! Get more for less ✨</h3>
                            <p className="opacity-90">Grab the bundle and save!</p>
                        </div>

                        <div className="p-8 text-center">
                            <p className="text-gray-600 mb-6">
                                You're looking at <span className="font-semibold text-rose-600">{originalProduct.name}</span>,
                                but did you know it's part of our <span className="font-bold text-gray-800">{bundle.name}</span>?
                            </p>

                            <div className="flex items-center gap-4 bg-rose-50 p-4 rounded-xl mb-8 text-left">
                                <img
                                    src={bundle.imageUrl}
                                    alt={bundle.name}
                                    className="w-20 h-20 rounded-lg object-cover"
                                />
                                <div>
                                    <h4 className="font-bold text-gray-800">{bundle.name}</h4>
                                    <p className="text-rose-600 font-bold text-xl">₱{bundle.price.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Link
                                    to={`/product/${bundle.id}`}
                                    onClick={onClose}
                                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.02] transition-all"
                                >
                                    View Bundle
                                </Link>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 text-gray-500 hover:text-gray-800 font-medium transition-colors"
                                >
                                    No thanks, I'll stick with {originalProduct.name}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UpsellModal;
