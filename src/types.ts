/**
 * Generic cached data wrapper used by CacheManager
 */
export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  description?: string;
  tags?: string[];
  available?: boolean;
  bundleItems?: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  searchQuery?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedOptions?: { [slotIndex: number]: string };
  cartItemId?: string; // Unique ID for cart management (handles duplicate products with diff options)
}

export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  studentId?: string;
  contactNumber?: string;
  facebookLink?: string;
}

/**
 * API response wrapper for all endpoints
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  cacheAge?: number;
}

/**
 * Filter options for product listing
 */
export interface FilterOptions {
  categories: string[];
  tags: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

/**
 * Order payload for submitting orders to the API
 */
export interface OrderPayload {
  timestamp: string;
  email: string;
  purchaserName: string;
  studentId: string;
  contactNumber: string;
  facebookLink: string;
  deliveryType?: 'deliver' | 'pickup';
  pickupDate?: string;
  recipientName: string;
  recipientContact: string;
  recipientFbLink: string;
  anonymous: boolean;
  deliveryDate1: string;
  venue1: string;
  room1: string;
  time1: string;
  deliveryDate2: string;
  venue2: string;
  room2: string;
  time2: string;
  cartItems: string;
  bundleDetails?: string;
  advocacyDonation: number;
  msgBeneficiary: string;
  msgRecipient: string;
  notes: string;
  total: number;
  items?: { id: string; quantity: number }[];
}