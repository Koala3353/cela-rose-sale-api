import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// Session/cookie-based imports removed — using JWTs instead
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';

// Load environment variables as early as possible so modules that import
// environment-dependent values (like `cache` or `sheets`) receive them.
dotenv.config();

import { cache } from './cache.js';
import {
  fetchSheetData, parseProductsData, extractFilterOptions, appendToSheet, fetchUserOrdersFromSheet,
  findOrderById,
  SheetOrder,
  fetchInventoryData,
  getBestSellers,
  InventoryItem
} from './sheets.js';
import { uploadToCloudinary } from './cloudinary.js';
import { Product, ApiResponse, FilterOptions, OrderPayload } from './types.js';
import { verifyGoogleToken, requireAuth, optionalAuth, SessionUser, createJwtToken } from './auth.js';
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
} from './analytics.js';
import { sendOrderConfirmationEmail } from './email.js';


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
// Hardcoded fallbacks to ensure Vercel deployment works without manual env setup
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1zroV5ASCbTRLWnkl1k1eKkJG992OZqhetdH9u48QZeU';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyBu7kB9rlIep8UGzyAsLksBcH_h3xOc9vs';
const PRODUCTS_SHEET_NAME = process.env.PRODUCTS_SHEET_NAME || 'Products';
const ORDERS_SHEET_NAME = process.env.ORDERS_SHEET_NAME || 'Orders';

// External inventory sheet (for stock counts and best sellers)
const INVENTORY_SHEET_ID = process.env.INVENTORY_SHEET_ID || '13Aj3iVnnNlKm7k72d-mV3Q4SWhBMClUdvLBMEdKRVC0';
const INVENTORY_SHEET_NAME = process.env.INVENTORY_SHEET_NAME || '🌺 INVENTORY';

// Parse allowed origins
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://koala3353.github.io'
];

// Merge env allowed origins with defaults to ensure we never block known frontends
const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

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
 * Fetch products from Google Sheets and merge inventory from external sheet
 * @param includeUnavailable - If true, includes products marked as unavailable (for bundle config lookups)
 */
async function getProductsFromSheet(includeUnavailable: boolean = false): Promise<Product[]> {
  const rawData = await fetchSheetData(GOOGLE_SHEET_ID, PRODUCTS_SHEET_NAME, GOOGLE_API_KEY);
  let products = parseProductsData(rawData);

  // Merge inventory data from external inventory sheet
  try {
    const inventory = await fetchInventoryData(INVENTORY_SHEET_ID, INVENTORY_SHEET_NAME);

    if (inventory.length > 0) {
      // Create a map for quick lookup by product name (case-insensitive)
      const inventoryMap = new Map<string, { availableStock: number; soldCount: number }>();
      for (const item of inventory) {
        inventoryMap.set(item.productName.toLowerCase().trim(), {
          availableStock: item.availableStock,
          soldCount: item.soldCount
        });
      }

      // Override stock values from inventory sheet
      products = products.map(product => {
        const invData = inventoryMap.get(product.name.toLowerCase().trim());
        if (invData) {
          return {
            ...product,
            stock: invData.availableStock, // Use inventory sheet's available stock
          };
        }
        return product;
      });

      console.log(`[Products] Merged inventory data for ${inventoryMap.size} products`);
    }
  } catch (error: any) {
    console.warn('[Products] Could not merge inventory data:', error.message);
    // Continue with products sheet stock values as fallback
  }

  // Filter out unavailable products unless explicitly requested
  if (includeUnavailable) {
    return products;
  }
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
 * Query params:
 *   - includeAll=true: Include unavailable products (for bundle configuration lookups)
 */
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    // Check if caller wants ALL products including unavailable (for bundle config)
    const includeAll = req.query.includeAll === 'true';

    // Use different cache keys for filtered vs unfiltered results
    const cacheKey = includeAll ? 'products-all' : CACHE_KEY_PRODUCTS;
    const cached = cache.get(cacheKey);

    if (cached) {
      const response: ApiResponse<Product[]> = {
        success: true,
        data: cached.data,
        cached: true,
        cacheAge: cache.getAge(cacheKey) || 0
      };
      return res.json(response);
    }

    // Cache miss - fetch from sheet
    const products = await getProductsFromSheet(includeAll);
    cache.set(cacheKey, products);

    // Also cache filters (always from available products only)
    if (!includeAll) {
      const filters = extractFilterOptions(products);
      cache.set(CACHE_KEY_FILTERS, filters);
    }

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
 * GET /api/bestsellers
 * Returns best selling products based on inventory data (most sold items)
 */
app.get('/api/bestsellers', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;

    // Fetch best sellers from inventory sheet
    const bestSellers = await getBestSellers(INVENTORY_SHEET_ID, INVENTORY_SHEET_NAME, limit);

    // Match best sellers with product data to get full product info
    const products = await getProductsFromSheet(true); // Include all products

    const bestSellerProducts = bestSellers
      .map(bs => {
        const product = products.find(
          p => p.name.toLowerCase().trim() === bs.productName.toLowerCase().trim()
        );
        if (product) {
          return {
            ...product,
            soldCount: bs.soldCount,
            originalStock: bs.originalStock,
            availableStock: bs.availableStock
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: bestSellerProducts
    });

  } catch (error: any) {
    console.error('[API] Error fetching best sellers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch best sellers'
    });
  }
});

/**
 * GET /api/inventory
 * Returns current inventory data from the external inventory sheet
 */
app.get('/api/inventory', async (req: Request, res: Response) => {
  try {
    const inventory = await fetchInventoryData(INVENTORY_SHEET_ID, INVENTORY_SHEET_NAME);

    res.json({
      success: true,
      data: inventory
    });

  } catch (error: any) {
    console.error('[API] Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch inventory'
    });
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
 * Force refresh the cache (both available-only and all products)
 */
app.post('/api/refresh', async (req: Request, res: Response) => {
  try {
    // Refresh available products
    const products = await cache.forceRefresh(CACHE_KEY_PRODUCTS);

    if (products) {
      const filters = extractFilterOptions(products);
      cache.set(CACHE_KEY_FILTERS, filters);
    }

    // Also refresh the products-all cache (includes unavailable products)
    const allProducts = await getProductsFromSheet(true);
    cache.set('products-all', allProducts);

    res.json({
      success: true,
      message: 'Cache refreshed successfully (including all products)',
      timestamp: new Date().toISOString(),
      productsCount: products?.length || 0,
      allProductsCount: allProducts?.length || 0
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
      // Stock updates are now handled automatically in the inventory sheet
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

    // Track order in analytics (with delivery type for stats)
    const itemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
    await trackOrder(order.total || 0, itemsCount, order.deliveryType, sessionUser?.id);

    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail({
      orderId,
      purchaserName,
      email,
      total: order.total || 0,
      cartItems: order.cartItems || '',
      deliveryType: order.deliveryType,
      deliveryDate1: order.deliveryDate1,
      time1: order.time1,
      venue1: order.venue1,
      room1: order.room1,
      recipientName: order.recipientName,
      advocacyDonation: order.advocacyDonation,
    }).catch(err => console.error('[API] Email send error:', err));

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
 * GET /api/orders/search
 * Search for an order by ID (public access for guests)
 */
app.get('/api/orders/search', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    console.log('[API] Searching for order:', orderId);

    // Import this function from sheets.ts (it will be available after the previous edit)
    const order = await findOrderById(
      GOOGLE_SHEET_ID,
      ORDERS_SHEET_NAME,
      orderId,
      GOOGLE_API_KEY
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const response: ApiResponse<SheetOrder> = {
      success: true,
      data: order
    };

    // Security Check: If it's a student order (has ID and not '000000' or '0'), require auth
    const studentIdStr = (order.studentId || '').trim();
    const idValue = parseInt(studentIdStr || '0', 10);
    // Guest if: empty string, '0', '000000', or non-numeric value
    const isGuest = !studentIdStr || idValue === 0 || isNaN(idValue) || studentIdStr === '000000';

    if (!isGuest) {
      return res.status(403).json({
        success: false,
        error: 'REQUIRES_AUTH',
        message: 'This order is linked to a student account. Please sign in to view.'
      });
    }

    res.json(response);

  } catch (error: any) {
    console.error('[API] Error searching order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search order'
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
    await trackProductView(id, sessionUser?.id);

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
app.post('/api/analytics/pageview', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { page } = req.body;
    const sessionUser = (req as any).user as SessionUser | undefined;
    console.log('[API] Analytics pageview:', { page, user: sessionUser?.id });

    if (page === 'home') {
      await trackHomePageView(sessionUser?.id);
    } else if (page === 'shop') {
      await trackShopPageView(sessionUser?.id);
    } else if (page === 'product') {
      await trackProductView(req.body.productId, sessionUser?.id);
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

// Debug analytics route
app.get('/api/debug/analytics', async (req: Request, res: Response) => {
  try {
    if (!GOOGLE_SHEET_ID) throw new Error('No Sheet ID');
    const testRow = [new Date().toISOString(), 'TEST_WRITE', 'Check', 'If', 'Working'];
    await appendToSheet(GOOGLE_SHEET_ID, 'Analytics', [testRow]);
    res.json({ success: true, message: 'Wrote test row to Analytics sheet' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
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

// Initialize function - runs once
let initialized = false;
async function initializeOnce() {
  if (initialized) return;
  initialized = true;

  await initAnalytics();
  console.log('[Server] 📊 Analytics loaded');

  if (GOOGLE_SHEET_ID && GOOGLE_API_KEY) {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
      console.log('[Server] ✅ Service Account configured');
    }
    await initializeCache();
  }
}

// For Vercel serverless - don't call app.listen(), just export the app
// Vercel sets VERCEL=1 or NODE_ENV=production
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (!isVercel) {
  // Start server for local development
  app.listen(PORT, async () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           🌹 Rose Sale API Server                          ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║  Cache TTL: ${process.env.CACHE_TTL || '30000'}ms                                    ║
╚════════════════════════════════════════════════════════════╝
    `);

    await initializeOnce();
  });
} else {
  // On Vercel, initialize immediately (will be called on cold start)
  initializeOnce().catch(err => console.error('[Server] Init error:', err));
}

export default app;

