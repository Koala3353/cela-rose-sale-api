import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist cart to local storage so refresh doesn't lose it
  useEffect(() => {
    const savedCart = localStorage.getItem('rose_cart');
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      // Migrate legacy items: ensure they have cartItemId
      const migrated = parsed.map((item: any) => ({
        ...item,
        cartItemId: item.cartItemId || `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      setCart(migrated);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rose_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product & { selectedOptions?: any }) => {
    setCart(prev => {
      // Find item with same ID AND same options
      const existingRequestOptions = JSON.stringify(product.selectedOptions || {});

      const existing = prev.find(item => {
        const itemOptions = JSON.stringify(item.selectedOptions || {});
        return item.id === product.id && itemOptions === existingRequestOptions;
      });

      if (existing) {
        return prev.map(item =>
          (item.cartItemId === existing.cartItemId)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      // New item: generate unique cartItemId
      const uniqueId = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return [...prev, { ...product, quantity: 1, cartItemId: uniqueId }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
