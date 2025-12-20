import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import RoseLoader from './RoseLoader';

interface ProductCardProps {
  product: Product;
  index?: number;
  onQuickAdd?: (product: Product) => void;
}

const ProductCard = ({ product, index = 0, onQuickAdd }: ProductCardProps) => {
  const { addToCart, setIsCartOpen } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToCart = () => {
    if (product.stock === 0) return;

    // If it's a bundle and we have a handler, delegate to it (open modal)
    if (product.bundleItems && onQuickAdd) {
      onQuickAdd(product);
      return;
    }

    addToCart(product);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      setIsCartOpen(true);
    }, 800);
  };

  const stockStatus = () => {
    if (product.stock === 0) return { text: 'Out of Stock', color: 'bg-gray-100 text-gray-500' };
    if (product.stock < 5) return { text: `Only ${product.stock} left!`, color: 'bg-rose-100 text-rose-600' };
    if (product.stock < 10) return { text: `${product.stock} left`, color: 'bg-amber-100 text-amber-600' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-600' };
  };

  const status = stockStatus();

  return (
    <motion.div
      className="card group relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden aspect-square bg-rose-50">
        <Link to={`/product/${product.id}`} className="block w-full h-full cursor-pointer">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
              <RoseLoader size="sm" />
            </div>
          )}
          <motion.img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />

          {/* Overlay on hover - inside Link so it's clickable part of the card */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Stock Badge - inside Link */}
          <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.text}
          </span>

          {/* Category Tag - inside Link */}
          {product.category && (
            <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
              {product.category}
            </span>
          )}
        </Link>

        {/* Quick Add Button - separate from Link, higher z-index */}
        <motion.button
          onClick={(e) => {
            e.preventDefault(); // Safety check
            handleAddToCart();
          }}
          disabled={product.stock === 0}
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-medium shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 z-10 ${product.stock === 0
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-white text-rose-600 hover:bg-rose-600 hover:text-white'
            }`}
          whileTap={{ scale: 0.95 }}
        >
          {product.stock === 0 ? 'Sold Out' : (product.bundleItems ? 'Customize' : 'Quick Add')}
        </motion.button>
      </div>

      {/* Content */}
      <div className="p-5">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-lg font-playfair font-bold text-gray-800 mb-1 line-clamp-1 hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-rose-50 text-rose-500 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold gradient-text">₱{product.price.toFixed(2)}</span>
          </div>

          <motion.button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`p-3 rounded-full transition-all duration-300 ${product.stock === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
              }`}
            whileHover={{ scale: product.stock > 0 ? 1.1 : 1 }}
            whileTap={{ scale: product.stock > 0 ? 0.9 : 1 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Added to Cart Animation */}
      <AnimatePresence>
        {isAdded && (
          <motion.div
            className="absolute inset-0 bg-rose-500/90 flex items-center justify-center rounded-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-white text-center"
            >
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium">Added to Cart!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductCard;