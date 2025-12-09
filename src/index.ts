import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// Session/cookie-based imports removed — using JWTs instead
import dotenv from 'dotenv';
import multer from 'multer';

// Load environment variables as early as possible so modules that import
// environment-dependent values (like `cache` or `sheets`) receive them.
dotenv.config();

import { cache } from './cache';
import { fetchSheetData, parseProductsData, extractFilterOptions, appendToSheet, updateStockCounts, fetchUserOrdersFromSheet, SheetOrder } from './sheets';
import { uploadToImgur } from './imgur';
import { Product, ApiResponse, FilterOptions, OrderPayload } from './types';
import { verifyGoogleToken, requireAuth, optionalAuth, SessionUser, createJwtToken } from './auth';
import {
  initAnalytics,
  saveAnalytics,
  trackHomePageView,
  trackShopPageView,
  trackProductView,
  trackSession,
  trackOrder,
  trackApiCall,
  getAnalyticsSnapshot,
  resetAnalytics
} from './analytics';

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// When running behind a proxy (like Vercel), trust the first proxy so
// secure cookies and protocol detection work correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
// Configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const PRODUCTS_SHEET_NAME = process.env.PRODUCTS_SHEET_NAME || 'Products';
const ORDERS_SHEET_NAME = process.env.ORDERS_SHEET_NAME || 'Orders';

// Parse allowed origins - include GitHub Pages by default
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://koala3353.github.io'
];
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || defaultOrigins;

// Middleware
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Ensure preflight OPTIONS requests are handled for all routes. This helps
// avoid some "CORS request did not succeed" cases when a proxy or CDN
// otherwise interferes with preflight. We reuse the same origin checker.
app.options('*', (req, res) => {
  const origin = req.header('Origin') || '';
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendStatus(204);
  }
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  console.log(`[CORS] Blocked preflight origin: ${origin}`);
  return res.sendStatus(403);
});

// Using stateless JWT authentication; no server-side session middleware configured.

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Cache keys
const CACHE_KEY_PRODUCTS = 'products';
const CACHE_KEY_FILTERS = 'filters';

/**
 * Fetch products from Google Sheets
 */
async function getProductsFromSheet(): Promise<Product[]> {
  const rawData = await fetchSheetData(GOOGLE_SHEET_ID, PRODUCTS_SHEET_NAME, GOOGLE_API_KEY);
  const products = parseProductsData(rawData);
  // Filter out unavailable products
  return products.filter(p => p.available !== false);
}

/**
 * Initialize cache with auto-refresh
 */
async function initializeCache(): Promise<void> {
  console.log('[Server] Initializing cache...');

  try {
    // Fetch initial data
    const products = await getProductsFromSheet();
    cache.set(CACHE_KEY_PRODUCTS, products);

    const filters = extractFilterOptions(products);
    cache.set(CACHE_KEY_FILTERS, filters);

    // Setup auto-refresh for products
    cache.setupAutoRefresh(CACHE_KEY_PRODUCTS, async () => {
      const newProducts = await getProductsFromSheet();
      // Also update filters when products refresh
      const newFilters = extractFilterOptions(newProducts);
      cache.set(CACHE_KEY_FILTERS, newFilters);
      return newProducts;
    });

    console.log('[Server] Cache initialized successfully');
  } catch (error) {
    console.error('[Server] Failed to initialize cache:', error);
    console.log('[Server] API will attempt to fetch on first request');
  }
}

// ============== ROUTES ==============

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  const stats = cache.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: stats
  });
});

// ============== AUTH ROUTES ==============

/**
 * POST /api/auth/google
 * Verify Google ID token and create session
 */
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing idToken in request body',
      });
    }

    // Verify the token with Google
    const user = await verifyGoogleToken(idToken);

    // Create a JWT and return it to the client. Client should store the token
    // and include it in Authorization: Bearer <token> for authenticated requests.
    const token = createJwtToken(user);

    // Track session in analytics
    trackSession(user.id);

    console.log('[Auth] User logged in:', user.email);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          photoUrl: user.picture,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Google login failed:', error.message);
    res.status(401).json({
      success: false,
      error: 'Invalid Google token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session and clear cookie
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  // With JWT-based auth, logout is handled on the client by deleting the token.
  // We still provide this endpoint for compatibility; it simply returns success.
  console.log('[Auth] Logout endpoint called');
  res.json({ success: true, message: 'Logged out (client should remove token)' });
});

/**
 * GET /api/auth/me
 * Get current user from session
 */
app.get('/api/auth/me', optionalAuth, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser | undefined;
  console.log('[Auth] /me called - authHeader=', req.headers.authorization || 'none', 'user=', !!user);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  res.json({
    success: true,
    data: { user: { id: user.id, email: user.email, name: user.name, photoUrl: user.picture } },
  });
});

/**
 * GET /api/debug
 * Simple debugging endpoint to inspect incoming headers and auth info.
 * Useful to confirm whether an Authorization header or cookies are being sent.
 */
app.get('/api/debug', (req: Request, res: Response) => {
  try {
    const info = {
      headers: {
        origin: req.headers.origin || null,
        authorization: req.headers.authorization || null,
        cookie: req.headers.cookie || null,
        host: req.headers.host || null,
        referer: req.headers.referer || null,
      },
      user: (req as any).user || null,
    };
    console.log('[Debug] /api/debug called:', info);
    res.json({ success: true, data: info });
  } catch (err) {
    console.error('[Debug] failed:', err);
    res.status(500).json({ success: false, error: 'Debug failed' });
  }
});

/**
 * GET /api/products
 * Returns all available products with caching
 */
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const cached = cache.get(CACHE_KEY_PRODUCTS);

    if (cached) {
      const response: ApiResponse<Product[]> = {
        success: true,
        data: cached.data,
        cached: true,
        cacheAge: cache.getAge(CACHE_KEY_PRODUCTS) || 0
      };
      return res.json(response);
    }

    // Cache miss - fetch from sheet
    const products = await getProductsFromSheet();
    cache.set(CACHE_KEY_PRODUCTS, products);

    // Also cache filters
    const filters = extractFilterOptions(products);
    cache.set(CACHE_KEY_FILTERS, filters);

    const response: ApiResponse<Product[]> = {
      success: true,
      data: products,
      cached: false
    };
    res.json(response);

  } catch (error: any) {
    console.error('[API] Error fetching products:', error);

    // Try to return stale cache if available
    const stale = cache.get(CACHE_KEY_PRODUCTS);
    if (stale) {
      const response: ApiResponse<Product[]> = {
        success: true,
        data: stale.data,
        cached: true,
        cacheAge: cache.getAge(CACHE_KEY_PRODUCTS) || 0,
        error: 'Serving stale data due to fetch error'
      };
      return res.json(response);
    }

    const response: ApiResponse<Product[]> = {
      success: false,
      error: error.message || 'Failed to fetch products'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/filters
 * Returns available filter options (categories, tags, price range)
 */
app.get('/api/filters', async (req: Request, res: Response) => {
  try {
    const cached = cache.get(CACHE_KEY_FILTERS);

    if (cached) {
      const response: ApiResponse<FilterOptions> = {
        success: true,
        data: cached.data,
        cached: true,
        cacheAge: cache.getAge(CACHE_KEY_FILTERS) || 0
      };
      return res.json(response);
    }

    // Need to fetch products first to extract filters
    const productsCached = cache.get(CACHE_KEY_PRODUCTS);
    let products: Product[];

    if (productsCached) {
      products = productsCached.data;
    } else {
      products = await getProductsFromSheet();
      cache.set(CACHE_KEY_PRODUCTS, products);
    }

    const filters = extractFilterOptions(products);
    cache.set(CACHE_KEY_FILTERS, filters);

    const response: ApiResponse<FilterOptions> = {
      success: true,
      data: filters,
      cached: false
    };
    res.json(response);

  } catch (error: any) {
    console.error('[API] Error fetching filters:', error);
    const response: ApiResponse<FilterOptions> = {
      success: false,
      error: error.message || 'Failed to fetch filters'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/refresh
 * Force refresh the cache
 */
app.post('/api/refresh', async (req: Request, res: Response) => {
  try {
    const products = await cache.forceRefresh(CACHE_KEY_PRODUCTS);

    if (products) {
      const filters = extractFilterOptions(products);
      cache.set(CACHE_KEY_FILTERS, filters);
    }

    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[API] Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh cache'
    });
  }
});

/**
 * POST /api/orders
 * Submit a new order (requires authentication)
 * Accepts multipart/form-data with orderData (JSON) and optional paymentProof (image)
 */
app.post('/api/orders', upload.single('paymentProof'), requireAuth, async (req: Request, res: Response) => {
  try {
    // Parse order data from form field
    let order: OrderPayload;
    try {
      order = JSON.parse(req.body.orderData || '{}');
    } catch {
      // Fallback to direct body parsing for JSON requests
      order = req.body;
    }

    const sessionUser = (req as any).user as SessionUser;
    const uploadedFile = req.file;

    console.log('[API] Processing order for user:', sessionUser.email);
    if (uploadedFile) {
      console.log('[API] Payment proof received:', uploadedFile.originalname, uploadedFile.size, 'bytes');
    }

    // Use session user email if not provided
    const email = order.email || sessionUser.email;
    const purchaserName = order.purchaserName || sessionUser.name;

    // Validate required fields
    if (!email || !purchaserName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and purchaserName'
      });
    }

    // Generate order ID
    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const timestamp = new Date().toISOString();

    // Upload payment proof to Imgur if provided
    let paymentProofLink = '';
    if (uploadedFile) {
      try {
        const fileName = `${orderId}_payment_${Date.now()}_${uploadedFile.originalname}`;
        paymentProofLink = await uploadToImgur(
          uploadedFile.buffer,
          fileName
        );
      } catch (uploadError: any) {
        console.error('[API] Failed to upload payment proof:', uploadError.message);
        // Continue without the link - order is still valid
      }
    }

    // Build the row to append to the orders sheet
    // Columns should match your "Orders" sheet headers
    const orderRow = [
      orderId,
      timestamp,
      email,
      purchaserName,
      order.studentId || '',
      order.contactNumber || '',
      order.facebookLink || '',
      order.recipientName || '',
      order.recipientContact || '',
      order.recipientFbLink || '',
      order.anonymous ? 'Yes' : 'No',
      // Delivery 1
      order.deliveryDate1 || '',
      order.time1 || '',
      order.venue1 || '',
      order.room1 || '',
      // Delivery 2
      order.deliveryDate2 || '',
      order.time2 || '',
      order.venue2 || '',
      order.room2 || '',
      // Items and details
      order.cartItems || '',
      order.bundleDetails || '',
      String(order.advocacyDonation || 0),
      order.msgBeneficiary || '',
      order.msgRecipient || '',
      order.notes || '',
      String(order.total || 0),
      'Pending', // Status
      paymentProofLink, // Payment Proof Link (column AB)
      paymentProofLink ? `=IMAGE("${paymentProofLink.replace('/view', '/preview')}")` : '' // Payment Proof Image (column AC)
    ];

    // Append to Google Sheet
    try {
      await appendToSheet(GOOGLE_SHEET_ID, ORDERS_SHEET_NAME, [orderRow], true); // Use queue for orders
      console.log('[API] Order saved to sheet:', orderId);

      // After saving the order, update stock counts
      if (order.items && order.items.length > 0) {
        const products = await getProductsFromSheet();
        const stockUpdates = new Map<string, number>();

        for (const item of order.items) {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const newStock = product.stock - item.quantity;
            stockUpdates.set(item.id, newStock < 0 ? 0 : newStock);
          }
        }

        if (stockUpdates.size > 0) {
          await updateStockCounts(GOOGLE_SHEET_ID, PRODUCTS_SHEET_NAME, stockUpdates);
        }
      }
    } catch (sheetError: any) {
      console.error('[API] Failed to save order to sheet or update stock:', sheetError.message);
      // Continue anyway - order will still be saved locally on frontend
    }

    console.log('[API] New order received:', {
      orderId,
      userId: sessionUser.id,
      email,
      name: purchaserName,
      total: order.total,
      items: order.cartItems
    });

    // Track order in analytics
    trackOrder(order.total || 0, sessionUser.id);

    res.json({
      success: true,
      data: {
        orderId,
        message: 'Order submitted successfully',
        timestamp
      }
    });

  } catch (error: any) {
    console.error('[API] Error submitting order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit order'
    });
  }
});

/**
 * GET /api/orders
 * Fetch orders for the authenticated user from the Orders sheet
 */
app.get('/api/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user as SessionUser;
    const userEmail = sessionUser.email;

    console.log('[API] Fetching orders for user:', userEmail);

    const orders = await fetchUserOrdersFromSheet(
      GOOGLE_SHEET_ID,
      ORDERS_SHEET_NAME,
      userEmail,
      GOOGLE_API_KEY
    );

    const response: ApiResponse<SheetOrder[]> = {
      success: true,
      data: orders
    };

    res.json(response);

  } catch (error: any) {
    console.error('[API] Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let products: Product[];
    const cached = cache.get(CACHE_KEY_PRODUCTS);

    if (cached) {
      products = cached.data;
    } else {
      products = await getProductsFromSheet();
      cache.set(CACHE_KEY_PRODUCTS, products);
    }

    const product = products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Track product view
    const sessionUser = (req as any).user as SessionUser | undefined;
    trackProductView(id, sessionUser?.id);

    res.json({
      success: true,
      data: product,
      cached: !!cached
    });

  } catch (error: any) {
    console.error('[API] Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch product'
    });
  }
});

// ==========================================
// Analytics Endpoints
// ==========================================

/**
 * POST /api/analytics/pageview
 * Track a page view from the frontend
 */
app.post('/api/analytics/pageview', optionalAuth, (req: Request, res: Response) => {
  try {
    const { page } = req.body;
    const sessionUser = (req as any).user as SessionUser | undefined;
    console.log('[API] Analytics pageview:', { page, user: sessionUser?.id });

    if (page === 'home') {
      trackHomePageView(sessionUser?.id);
    } else if (page === 'shop') {
      trackShopPageView(sessionUser?.id);
    } else if (page === 'product') {
      trackProductView(req.body.productId, sessionUser?.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[API] Analytics tracking failed:', err);
    // Return 200 to avoid breaking frontend analytics flow, but report failure
    res.status(500).json({ success: false, error: (err as any)?.message || 'Analytics failed' });
  }
});

/**
 * GET /api/analytics
 * Get analytics snapshot (could be admin-only in production)
 */
app.get('/api/analytics', (req: Request, res: Response) => {
  const stats = getAnalyticsSnapshot();

  res.json({
    success: true,
    data: stats
  });
});

/**
 * POST /api/analytics/reset
 * Reset analytics (admin-only in production)
 */
app.post('/api/analytics/reset', (req: Request, res: Response) => {
  resetAnalytics();

  res.json({
    success: true,
    message: 'Analytics reset successfully'
  });
});

// 404 handler - return list of available endpoints
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.path,
    availableEndpoints: {
      health: {
        'GET /health': 'Health check with cache statistics'
      },
      auth: {
        'POST /api/auth/google': 'Login with Google ID token',
        'POST /api/auth/logout': 'Logout and destroy session',
        'GET /api/auth/me': 'Get current authenticated user'
      },
      products: {
        'GET /api/products': 'Get all available products',
        'GET /api/products/:id': 'Get a single product by ID',
        'GET /api/filters': 'Get filter options (categories, tags, price range)',
        'POST /api/refresh': 'Force refresh cache from Google Sheets'
      },
      orders: {
        'POST /api/orders': 'Submit a new order (requires auth)',
        'GET /api/orders': 'Get orders for authenticated user'
      },
      analytics: {
        'GET /api/analytics': 'Get analytics snapshot',
        'POST /api/analytics/pageview': 'Track a page view',
        'POST /api/analytics/reset': 'Reset all analytics'
      }
    }
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🌹 Rose Sale API Server                          ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║  Cache TTL: ${process.env.CACHE_TTL || '30000'}ms                                    ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Load analytics data
  initAnalytics();
  console.log('[Server] 📊 Analytics loaded');

  // Validate configuration
  if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
    console.warn('[Server] ⚠️  Missing Google Sheets configuration!');
    console.warn('[Server] Set GOOGLE_SHEET_ID and GOOGLE_API_KEY in .env');
  } else {
    // Initialize cache on startup
    await initializeCache();
  }
});

export default app;
