import {
  INITIAL_PRODUCTS,
  CACHE_KEY_PRODUCTS,
  CACHE_KEY_FILTERS,
  CACHE_DURATION_MS,
  API_BASE_URL
} from '../constants';
import { Product, OrderFormData, CartItem, Order, ProductFilters } from '../types';
import { getAuthHeaders } from './auth';

interface CachedData {
  timestamp: number;
  products: Product[];
}

interface CachedFilters {
  timestamp: number;
  categories: string[];
  tags: string[];
  priceRange: { min: number; max: number };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  cacheAge?: number;
}

// Clear product cache on page load/refresh to always get latest data from API
// The API server has its own caching with the Google Sheet data
if (typeof window !== 'undefined') {
  localStorage.removeItem(CACHE_KEY_PRODUCTS);
  localStorage.removeItem(CACHE_KEY_FILTERS);
  console.log('Page load - cleared local product cache to fetch fresh from API');
}

/**
 * Product fetch result with fallback indicator
 */
export interface ProductsResult {
  products: Product[];
  isFallback: boolean;
  isExpiredCache: boolean;
}

/**
 * Fetches products from the API server (which caches Google Sheets data)
 */
export const fetchProducts = async (): Promise<ProductsResult> => {


  // Check local cache first for instant loading
  const cached = localStorage.getItem(CACHE_KEY_PRODUCTS);

  if (cached) {
    const parsed: CachedData = JSON.parse(cached);
    const now = Date.now();

    // Use shorter local cache since API has its own caching
    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      console.log('Serving products from local cache');
      return { products: parsed.products, isFallback: false, isExpiredCache: false };
    }
  }

  try {
    // Fetch from API server
    const response = await fetch(`${API_BASE_URL}/products`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<Product[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch products');
    }

    const products = result.data;

    // Cache locally
    const newCache: CachedData = {
      timestamp: Date.now(),
      products
    };
    localStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(newCache));

    console.log(`Fetched ${products.length} products from API (cached: ${result.cached}, age: ${result.cacheAge}ms)`);
    return { products, isFallback: false, isExpiredCache: false };

  } catch (error) {
    console.error('Failed to fetch from API, trying fallback:', error);

    // Return cached data if available (even if expired)
    if (cached) {
      const parsed: CachedData = JSON.parse(cached);
      console.log('Serving expired local cache due to fetch error');
      return { products: parsed.products, isFallback: false, isExpiredCache: true };
    }

    // Last resort: use initial products
    console.log('Using fallback products');
    return { products: INITIAL_PRODUCTS, isFallback: true, isExpiredCache: false };
  }
};

/**
 * Fetches ALL products including unavailable ones from the API
 * Used for bundle configuration to display correct product names
 */
export const fetchAllProducts = async (): Promise<ProductsResult> => {
  try {
    // Fetch from API server with includeAll flag
    const response = await fetch(`${API_BASE_URL}/products?includeAll=true`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<Product[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch all products');
    }

    console.log(`Fetched ${result.data.length} products (including unavailable) from API`);
    return { products: result.data, isFallback: false, isExpiredCache: false };

  } catch (error) {
    console.error('Failed to fetch all products from API:', error);
    // Fallback to regular products fetch
    return fetchProducts();
  }
};

/**
 * Fetches filter options from the API
 */
export const fetchFilters = async (): Promise<CachedFilters | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/filters`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<CachedFilters> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch filters');
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch filters:', error);
    return null;
  }
};

/**
 * Extracts available filter options from products
 */
export const extractFilters = (products: Product[]): CachedFilters => {
  const categories = [...new Set(products.map(p => p.category))].sort();
  const allTags = products.flatMap(p => p.tags || []);
  const tags = [...new Set(allTags)].sort();

  const prices = products.map(p => p.price);
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };

  return {
    timestamp: Date.now(),
    categories,
    tags,
    priceRange
  };
};

/**
 * Filters products based on given criteria
 */
export const filterProducts = (products: Product[], filters: ProductFilters): Product[] => {
  return products.filter(product => {
    // Category filter
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    // Price range filter
    if (filters.minPrice !== undefined && product.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) {
      return false;
    }

    // Stock filter
    if (filters.inStock && product.stock <= 0) {
      return false;
    }

    // Tags filter (product must have at least one matching tag)
    if (filters.tags && filters.tags.length > 0) {
      const productTags = product.tags || [];
      const hasMatchingTag = filters.tags.some(tag => productTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(query);
      const matchesDescription = product.description?.toLowerCase().includes(query);
      const matchesCategory = product.category.toLowerCase().includes(query);
      const matchesTags = product.tags?.some(t => t.toLowerCase().includes(query));

      if (!matchesName && !matchesDescription && !matchesCategory && !matchesTags) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Clears the products cache (useful for forcing a refresh)
 */
export const clearProductsCache = (): void => {
  localStorage.removeItem(CACHE_KEY_PRODUCTS);
  localStorage.removeItem(CACHE_KEY_FILTERS);
  console.log('Products cache cleared');
};

// Simulate "Server-Side" DB using LocalStorage for demo purposes
const ORDERS_KEY = 'rose_sale_orders_db';

/**
 * Order data from the Google Sheet Orders tab
 */
export interface SheetOrder {
  orderId: string;
  timestamp: string;
  email: string;
  purchaserName: string;
  studentId: string;
  contactNumber: string;
  facebookLink: string;
  recipientName: string;
  recipientContact: string;
  recipientFbLink: string;
  anonymous: boolean;
  deliveryDate1: string;
  time1: string;
  venue1: string;
  room1: string;
  deliveryDate2: string;
  time2: string;
  venue2: string;
  room2: string;
  cartItems: string;
  bundleDetails: string;
  advocacyDonation: number;
  msgBeneficiary: string;
  msgRecipient: string;
  notes: string;
  total: number;
  payment: number;
  status: string;
  paymentConfirmed: boolean;
  assignedDoveEmail: string;
}

export const submitOrder = async (orderData: any, paymentProof: File): Promise<string | null> => {
  // Use FormData to support file upload
  const formData = new FormData();

  formData.append('orderData', JSON.stringify(orderData));

  // Add payment proof file if provided
  if (paymentProof) {
    formData.append('paymentProof', paymentProof);
  }

  try {
    // Submit to API server. Use JWT Authorization header if available.
    const headers = getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: formData  // Don't set Content-Type header - browser will set it with boundary
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to submit order');
    }

    console.log("Order submitted successfully:", result.data);
    const orderId = result.data?.orderId || 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Store locally for order history
    const newOrder: Order = {
      ...(orderData as OrderFormData),
      id: orderId,
      date: new Date().toISOString(),
      status: 'Pending',
      items: orderData.items,
    };

    const existingOrdersStr = localStorage.getItem(ORDERS_KEY);
    const existingOrders: Order[] = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
    localStorage.setItem(ORDERS_KEY, JSON.stringify([newOrder, ...existingOrders]));

    return orderId;
  } catch (error) {
    console.error("Failed to submit order:", error);
    return null;
  }
};

export const fetchUserOrders = async (email: string): Promise<SheetOrder[]> => {
  try {
    // Fetch orders from API (which reads from Google Sheet Orders tab)
    const headers = getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('User not authenticated, returning empty orders');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch orders');
    }

    console.log(`Fetched ${result.data.length} orders for ${email} from API`);
    return result.data;

  } catch (error) {
    console.error('Failed to fetch orders from API:', error);
    return [];
  }
};

// Search for an order by ID (guest access)
export const searchOrder = async (orderId: string): Promise<SheetOrder | null> => {
  try {
    // Try API first
    const response = await fetch(`${API_BASE_URL}/orders/search?orderId=${encodeURIComponent(orderId)}`);

    if (response.status === 403) {
      const data = await response.json();
      throw { code: 'REQUIRES_AUTH', message: data.message };
    }

    if (response.ok) {
      const json = await response.json();
      if (json.success) return json.data;
    }

    // If API returns 404 or other error, return null (order not found)
    console.log('Order search API returned non-success:', response.status);
    return null;

  } catch (error: any) {
    if (error.code === 'REQUIRES_AUTH') throw error;
    console.error('API Search failed:', error);
    return null;
  }
};

/**
 * Track a page view for analytics
 */
export const trackPageView = async (page: 'home' | 'shop' | 'product', productId?: string): Promise<void> => {
  try {
    // Analytics should be fire-and-forget and not rely on cookies to avoid
    // third-party cookie issues when the frontend is hosted on a different origin.
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };

    await fetch(`${API_BASE_URL}/analytics/pageview`, {
      method: 'POST',
      headers,
      // Do NOT include credentials here on purpose — analytics doesn't require auth
      // and omitting credentials avoids third-party cookie problems in some browsers.
      body: JSON.stringify({ page, productId }),
    });
  } catch (error) {
    // Silently fail - analytics should not affect user experience
    console.debug('Analytics tracking failed:', error);
  }
};

/**
 * Fetch analytics data
 */
export const fetchAnalytics = async (): Promise<any> => {
  try {
    const headers = getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/analytics`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return null;
  }
};