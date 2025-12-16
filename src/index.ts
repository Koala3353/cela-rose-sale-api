import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// Session/cookie-based imports removed — using JWTs instead
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';

// Load environment variables as early as possible so modules that import
// environment-dependent values (like `cache` or `sheets`) receive them.
dotenv.config();

import { cache } from './cache';
import {
  fetchSheetData, parseProductsData, extractFilterOptions, appendToSheet, updateStockCounts, fetchUserOrdersFromSheet,
  findOrderById,
  SheetOrder
} from './sheets';
import { uploadToCloudinary } from './cloudinary';
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
    await trackSession(user.id);

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
app.post('/api/orders', optionalAuth, upload.single('paymentProof'), async (req: Request, res: Response) => {
  try {
    // Parse order data from form field
    let order: OrderPayload;
    try {
      order = JSON.parse(req.body.orderData || '{}');
    } catch {
      // Fallback to direct body parsing for JSON requests
      order = req.body;
    }

    const sessionUser = (req as any).user as SessionUser | undefined;
    const uploadedFile = req.file;

    console.log('[API] Processing order for user:', sessionUser?.email || 'Guest');
    if (uploadedFile) {
      console.log('[API] Payment proof received:', uploadedFile.originalname, uploadedFile.size, 'bytes');
    }

    // Use session user email if not provided
    const email = order.email || sessionUser?.email;
    const purchaserName = order.purchaserName || sessionUser?.name;

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

    // Upload payment proof to Cloudinary if provided
    let paymentProofLink = '';
    if (uploadedFile) {
      try {
        const fileName = `${orderId}_proof_${Date.now()}`;
        paymentProofLink = await uploadToCloudinary(
          uploadedFile.buffer,
          fileName
        );
      } catch (uploadError: any) {
        console.error('[API] Failed to upload payment proof to Cloudinary:', uploadError.message);
        // Continue without the link - order is still valid
      }
    }

    // Build the row to append to the orders sheet
    // Columns should match your "Orders" sheet headers
    // A-T: orderId, timestamp, email, purchaserName, studentId, contactNumber, facebookLink,
    //      recipientName, recipientContact, recipientFbLink, anonymous,
    //      deliveryDate1, time1, venue1, room1, deliveryDate2, time2, venue2, room2, cartItems
    // U: total, V: advocacyDonation, W: msgBeneficiary, X: msgRecipient, Y: notes, Z: Status
    // AA-AB: Reserved for Google Apps Script, AC: paymentProofLink
    const orderRow = [
      orderId,                          // A
      timestamp,                        // B
      email,                            // C
      purchaserName,                    // D
      order.studentId || '',            // E
      order.contactNumber || '',        // F
      order.facebookLink || '',         // G
      order.recipientName || '',        // H
      order.recipientContact || '',     // I
      order.recipientFbLink || '',      // J
      order.anonymous ? 'Yes' : 'No',   // K
      // Delivery 1
      order.deliveryDate1 || '',        // L
      order.time1 || '',                // M
      order.venue1 || '',               // N
      order.room1 || '',                // O
      // Delivery 2
      order.deliveryDate2 || '',        // P
      order.time2 || '',                // Q
      order.venue2 || '',               // R
      order.room2 || '',                // S
      // Items and total
      order.cartItems || '',            // T
      String(order.total || 0),         // U - Total cost
      String(order.advocacyDonation || 0), // V
      order.msgBeneficiary || '',       // W
      order.msgRecipient || '',         // X
      order.notes || '',                // Y
      'FALSE',                          // Z - Confirmed Payment (False by default)
      'Pending',                        // AA - Status
      '',                               // AB - Reserved for Google Apps Script
      paymentProofLink,                 // AC - Payment Proof Link
      order.bundleDetails || ''         // AD - Bundle Details
    ];

    // Append to Google Sheet
    console.log('[API] Order Row generated:', orderRow);
    console.log(`[API] Row length: ${orderRow.length}`);
    console.log(`[API] Index 19 (Cart): "${orderRow[19]}"`);
    console.log(`[API] Index 20 (Total): "${orderRow[20]}" (Should be Column U)`);
    console.log(`[API] Index 21 (Advocacy): "${orderRow[21]}"`);
    console.log(`[API] Index 26 (Status): "${orderRow[26]}" (Should be Column AA)`);

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
      // RE-THROW the error so the client knows it failed!
      throw new Error(`Failed to save order to Google Sheet: ${sheetError.message}`);
    }

    console.log('[API] New order received:', {
      orderId,
      userId: sessionUser?.id || 'guest',
      email,
      name: purchaserName,
      total: order.total,
      items: order.cartItems
    });

    // Track order in analytics
    const itemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
    await trackOrder(order.total || 0, itemsCount, sessionUser?.id);

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

// ... (rest of file)

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
  await initAnalytics();
  console.log('[Server] 📊 Analytics loaded');

  // Validate configuration
  if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
    console.warn('[Server] ⚠️  Missing Google Sheets configuration!');
    console.warn('[Server] Set GOOGLE_SHEET_ID and GOOGLE_API_KEY in .env');
  } else {
    // Check for Service Account
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 && !process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
      console.warn('[Server] ⚠️  No Service Account configured!');
      console.warn('[Server] Order submission will fail. Set GOOGLE_SERVICE_ACCOUNT_KEY_BASE64.');
    } else {
      console.log('[Server] ✅ Service Account configured');
    }

    // Initialize cache on startup
    await initializeCache();
  }
});

export default app;
